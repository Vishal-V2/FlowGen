import { ExecutionEnvironment, PhaseEnvironment } from "../schema/environment";

// Kept well below the Kafka consumer session timeout (30s by default):
// the worker does not send heartbeats while a phase is running.
const MAX_SECONDS = 15;

export const DelayExecutor = async (
  environmentio: PhaseEnvironment,
  environmentFn: ExecutionEnvironment
) => {
  const raw = environmentio.inputs["Seconds"]?.trim();
  const seconds = Number(raw);

  if (!raw || !Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_SECONDS) {
    environmentFn.log.ERROR(
      `Seconds must be a number between 1 and ${MAX_SECONDS} (got "${raw ?? ""}").`
    );
    return false;
  }

  environmentFn.log.INFO(`Waiting ${seconds} second(s)...`);
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  environmentFn.log.INFO("Done waiting.");
  return true;
};
