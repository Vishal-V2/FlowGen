import dotenv from "dotenv";
import path from "path";

import { Kafka } from "kafkajs";
import {
  AvailableAction,
  AvailableTrigger,
  ExecutionLog,
  ExecutionPhase,
  ExecutionPhaseStatus,
  prisma,
  TaskInfo,
  WorkflowExecutionStatus,
} from "@automation/db";
import { executePhase } from "./execution/executePhase";
import {
  cleanupEnvironment,
  getEnvironment,
} from "./execution/executionEnvironment";
import { Edge } from "./schema/types";
import { AppNode } from "./schema/appnode";
import { createLogCollector } from "./log";
import { updateWorkflowExecution } from "./actions/updateWorkflowExecution";
import { getExecutionDetails } from "./actions/getExecutionDetails";
import {
  updateExecutionPhase,
  updatePendingExecutionPhases,
} from "./actions/updateExecutionPhase";
import { decrementUserBalance } from "./actions/updateUserBalance";

dotenv.config({ path: path.resolve(__dirname, "../../..", ".env") });

const TOPIC_NAME = "workflow-events";

const kafka = new Kafka({
  clientId: "worker",
  brokers: ["localhost:9092"],
});

async function main() {
  const consumer = kafka.consumer({ groupId: "main-worker-2" });
  await consumer.connect();
  const producer = kafka.producer();
  await producer.connect();

  await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: true });

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const rawValue = message.value?.toString();
      console.log({
        partition,
        offset: message.offset,
        value: rawValue,
      });

      if (!rawValue) {
        console.warn("⚠️ Empty Kafka message, skipping...");
        await commitOffset();
        return;
      }

      let parsedValue;
      try {
        parsedValue = JSON.parse(rawValue || "{}");
      } catch (err) {
        console.warn("⚠️ Invalid JSON in message, skipping...");
        await commitOffset();
        return;
      }

      const { executionId, stage } = parsedValue;

      if (!executionId || typeof stage !== "number") {
        console.warn("⚠️ Invalid message format, skipping...");
        await commitOffset();
        return;
      }

      try {
        if (stage == 1) {
          await updateWorkflowExecution(executionId, {
            status: WorkflowExecutionStatus.RUNNING,
            startedAt: new Date(),
            phases: {
              updateMany: {
                where: {},
                data: { status: ExecutionPhaseStatus.PENDING },
              },
            },
            workflow: {
              update: {
                lastRunStatus: WorkflowExecutionStatus.RUNNING,
                lastRunAt: new Date(),
                lastRunId: executionId,
              },
            },
          });
        }

        const executionWithPhases = await getExecutionDetails(
          executionId,
          stage
        );
        console.log("Execution with phases:", executionWithPhases);
        if (!executionWithPhases) {
          console.warn("⚠️ Phase not found, skipping...");
          await commitOffset();
          return;
        }

        const phase = executionWithPhases.phases[0];

        if (!phase) {
          console.warn("⚠️ Phase not found, skipping...");
          await commitOffset();
          return;
        }

        const edges = JSON.parse(executionWithPhases.definition)
          .edges as Edge[];

        const startedAt = new Date();
        const node = JSON.parse(phase.data) as AppNode;

        await updateExecutionPhase(phase.id, {
          status: ExecutionPhaseStatus.RUNNING,
          startedAt,
        });

        const plannedCredits = node.data.credits || 0;

        const userBalanceUpdateResult = await decrementUserBalance(
          executionWithPhases.userId,
          plannedCredits
        );
        // Only record credits that were actually debited from the user.
        const creditsConsumed = userBalanceUpdateResult.success
          ? plannedCredits
          : 0;

        const environment = getEnvironment(executionId);

        const logCollector = createLogCollector();

        let success = false;

        if (!userBalanceUpdateResult.success) {
          logCollector.ERROR(
            userBalanceUpdateResult.error || "Insufficient credit balance"
          );
        } else {
          try {
            success = await executePhase(
              phase,
              node,
              environment,
              edges,
              logCollector
            );
          } catch (err) {
            logCollector.ERROR(
              `Unexpected error: ${(err as Error)?.message ?? String(err)}`
            );
            success = false;
          }
        }

        await updateExecutionPhase(phase.id, {
          completedAt: new Date(),
          status: success
            ? ExecutionPhaseStatus.COMPLETED
            : ExecutionPhaseStatus.FAILED,
          inputs: JSON.stringify(environment.phases[node.id]?.inputs),
          outputs: JSON.stringify(environment.phases[node.id]?.outputs),
          workflowExecution: {
            update: {
              creditsConsumed: { increment: creditsConsumed },
            },
          },
          logs: {
            createMany: {
              data: logCollector.getAll(),
            },
          },
        });

        if (!success) {
          // A failed phase stops the run: cancel the remaining phases.
          await updatePendingExecutionPhases(
            executionId,
            {
              completedAt: new Date(),
              status: ExecutionPhaseStatus.CANCELLED,
            },
            {
              logLevel: "WARN",
              message: userBalanceUpdateResult.success
                ? `Cancelled because phase ${stage} failed.`
                : userBalanceUpdateResult.error ||
                  "Cancelled: insufficient credit balance.",
              timestamp: new Date(),
            }
          );
          await finalizeExecution(executionId, false);
        } else if (stage >= executionWithPhases._count.phases) {
          await finalizeExecution(executionId, true);
        } else {
          await producer.send({
            topic,
            messages: [
              {
                key: executionId,
                value: JSON.stringify({
                  executionId,
                  stage: stage + 1,
                }),
              },
            ],
          });
        }

        await commitOffset();
      } catch (err) {
        console.error(`❌ Error processing execution ${executionId}:`, err);
        // Never leave an execution stuck in RUNNING.
        await prisma.executionPhase
          .updateMany({
            where: {
              workflowExecutionId: executionId,
              status: ExecutionPhaseStatus.RUNNING,
            },
            data: {
              status: ExecutionPhaseStatus.FAILED,
              completedAt: new Date(),
            },
          })
          .catch((e) => console.error("Failed to mark running phase:", e));
        await updatePendingExecutionPhases(
          executionId,
          { completedAt: new Date(), status: ExecutionPhaseStatus.CANCELLED },
          {
            logLevel: "ERROR",
            message: "Cancelled due to an internal worker error.",
            timestamp: new Date(),
          }
        );
        await finalizeExecution(executionId, false);
        await commitOffset();
        return;
      }

      async function commitOffset() {
        await consumer.commitOffsets([
          {
            topic,
            partition,
            offset: (parseInt(message.offset) + 1).toString(),
          },
        ]);
      }
    },
  });
}

async function finalizeExecution(executionId: string, success: boolean) {
  await cleanupEnvironment(executionId);
  const status = success
    ? WorkflowExecutionStatus.COMPLETED
    : WorkflowExecutionStatus.FAILED;
  await updateWorkflowExecution(executionId, {
    status,
    completedAt: new Date(),
    workflow: { update: { lastRunStatus: status } },
  });
}

main();
