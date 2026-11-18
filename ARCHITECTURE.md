# FlowGen Architecture

## System diagram

```mermaid
flowchart LR
  User[User's browser]
  Clerk[Clerk identity service]

  subgraph Client[apps/client — Next.js 15 / React 19]
    UI[Dashboard and workflow editor<br/>React Flow, Apollo Client]
  end

  subgraph API[apps/server — Express and Apollo Server]
    GQL[GraphQL API<br/>HTTP /graphql and WebSocket /subscriptions]
    Auth[Clerk middleware and token verification]
    Hook[Inbound webhook route<br/>POST /webhook/:id]
    PubSub[In-process GraphQL PubSub]
    Services[User and workflow services]
  end

  subgraph Persistence[packages/db]
    Prisma[Prisma client]
    PG[(PostgreSQL<br/>workflow, execution, phase, catalog, credential, outbox data)]
  end

  subgraph Queue[Kafka execution pipeline]
    Processor[apps/processor<br/>Poll execution outbox]
    Kafka[(Kafka<br/>workflow-events topic)]
    Worker[apps/worker<br/>Consume and execute phases]
  end

  subgraph Runtime[Worker executors]
    Browser[Puppeteer<br/>headless browser]
    Egress[External HTTP endpoint\nTRIGGER_WEBHOOK action]
  end

  User --> UI
  UI <-->|Sign-in and session token| Clerk
  Clerk --> Auth
  UI -->|GraphQL queries and mutations<br/>Bearer token over HTTP| GQL
  UI <-->|GraphQL subscriptions<br/>Bearer token over WebSocket| GQL
  Auth --> GQL
  GQL --> Services
  Hook -->|Trigger active webhook workflow| Services
  Hook -->|Publish WEBHOOK_id event| PubSub
  PubSub -->|webhookEvent subscription| GQL
  Services -->|Read and write data; create execution, phases, and outbox transactionally| Prisma
  Prisma <--> PG
  Processor -->|Poll and delete published outbox rows| PG
  Processor -->|Initial {executionId, stage: 1}| Kafka
  Kafka -->|workflow-events| Worker
  Worker -->|Load plan/phase; write status, logs, outputs, credits| PG
  Worker -->|Next {executionId, stage}| Kafka
  Worker --> Browser
  Worker -->|POST configured target URL| Egress
```

## Components and responsibilities

- **Client (`apps/client`)** — Next.js App Router and React UI for sign-in, dashboards, workflow editing, execution history, and credentials. The editor uses React Flow (`@xyflow/react`) and builds an execution plan from the graph. Apollo Client sends GraphQL operations to the API over HTTP and subscriptions over WebSocket. Clerk's Next.js integration provides the browser session and route middleware.
- **Identity (`Clerk`)** — Supplies the authenticated user identity. The server uses Clerk Express middleware for HTTP requests and verifies the bearer token supplied when opening a GraphQL WebSocket connection.
- **API (`apps/server`)** — Express hosts Apollo Server at `/graphql`, GraphQL WebSocket subscriptions at `/subscriptions`, a health route, and `POST /webhook/:id`. GraphQL resolvers delegate to user and workflow services. The workflow service persists workflow definitions, publishes workflow state, and creates manual executions. The webhook route either starts an active workflow whose first phase is a webhook trigger or publishes the request body through the in-process PubSub for the `webhookEvent` subscription.
- **Database (`packages/db`, PostgreSQL)** — Prisma models persist users and balances, workflows, task catalog metadata, credentials, executions, ordered phases, logs, and execution outbox records. When a workflow run is created, the server transaction creates its execution and phases together with an outbox row.
- **Processor (`apps/processor`)** — Polls up to ten execution outbox rows, publishes stage-one events to Kafka's `workflow-events` topic, then deletes those rows.
- **Kafka (`workflow-events`)** — Carries `{ executionId, stage }` messages from the processor to the worker and between subsequent worker phases. The processor and worker currently configure the broker as `localhost:9092` in source.
- **Worker (`apps/worker`)** — Consumes execution events, loads the selected phase and task metadata from PostgreSQL, resolves inputs from the saved node and prior phase outputs, updates phase/execution state and credits, and invokes an executor from its registry. It sends a message for the next stage and holds browser/page state and phase outputs in a process-local execution environment until cleanup.
- **Worker integrations** — The browser actions use Puppeteer to launch and control a headless browser. `TRIGGER_WEBHOOK` makes an HTTP POST to its configured target URL. The `EXTRACT_DATA_WITH_AI` executor currently returns hard-coded mock data; although the OpenAI SDK is a dependency and invocation code is present in comments, no live OpenAI request is made.

## Execution flow

1. The user edits and saves a workflow in the client. The client derives a phased execution plan from the React Flow graph and sends workflow operations to the GraphQL API.
2. On a manual run, the API loads the workflow, creates an execution with phase rows from the submitted plan, and creates an outbox row in the same database transaction.
3. The processor finds the outbox row and publishes the initial stage event to Kafka. It then removes the published row from the outbox.
4. The worker consumes the event, loads the execution phase and workflow definition, charges the phase's configured credits, runs the task executor, and records inputs, outputs, logs, and status in PostgreSQL.
5. If more phases remain, the worker publishes the next stage to Kafka. On the final phase it marks the execution complete or failed and closes the execution's browser environment.
6. The client retrieves workflow and execution data through GraphQL. Webhook-event subscriptions use the server's in-process PubSub and WebSocket connection.

## Scope notes

The diagram reflects wired source paths, not every installed dependency. Cron expressions and next-run timestamps can be stored, but no scheduler loop was found. The server's `startKafkaConsumer` bridge for `run-updates` is defined but is not started by the server entry point. A Redis client module exists but is not used by the execution path. The OpenAI call is commented out as described above; these are therefore not shown as active services in the runtime diagram.
