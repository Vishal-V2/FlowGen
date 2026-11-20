# FlowGen — Visual Workflow Automation
## (Work in progress)

**FlowGen** is a visual workflow automation platform that lets you design, execute, and monitor automations using a drag-and-drop interface.  
It bridges triggers, actions, and data flow between services — turning complex backend automation into a visual experience.

<img width="1919" height="907" alt="image" src="https://github.com/user-attachments/assets/fd47cf58-6316-4e32-9332-40b7c6ee9ab5" />

<img width="1866" height="902" alt="image" src="https://github.com/user-attachments/assets/63223ad8-bba7-48c6-8774-7834929eb58d" />


---

## Features

- **Visual Workflow Builder** — Create automations by connecting triggers and actions in a React Flow-powered canvas.  
- **Dynamic Execution Engine** — Stepwise execution with real-time logging and error handling.  
- **Event-Driven Logic** — Automatically link outputs of one node to inputs of another.  
- **GraphQL API** — Unified data layer for workflows, triggers, and executions.  
- **Clerk Auth Integration** — Secure authentication and session management.  
- **Extensible Architecture** — Easily add new triggers or actions without changing the core engine.  

---

## Tech Stack

| Layer | Technologies |
|--------|---------------|
| **Frontend** | Next.js, React Flow, TailwindCSS, Shadcn/UI |
| **Backend** | Node.js, GraphQL (Apollo Server) |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | Clerk |
| **Realtime** | GraphQL Subscriptions |
| **Automation Engine** | Node.js executors (with Puppeteer support) |

## Local development

Requirements: Node.js 20 or newer, npm, and Docker with Compose. The worker also needs the Puppeteer-managed Chromium browser installed by the existing npm dependency setup.

1. Create a local environment file and generate its local-only database password and encryption key:

   ```sh
   npm run setup:local
   ```

2. `setup:local` enables `LOCAL_AUTH_BYPASS=true` for local development, so you can use a fixed local user without Clerk keys. This bypass only activates in development and the API/client bind to loopback while it is enabled. To use real Clerk authentication, disable the bypass and add the Clerk secret key to `CLERK_SECRET_KEY` and the publishable key to both `CLERK_PUBLISHABLE_KEY` (Express API) and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Next.js client). Clerk keys are required for a production client build.
3. Start PostgreSQL and Kafka. Compose initializes the `workflow-events` topic:

   ```sh
   docker compose up -d
   ```

4. Generate the Prisma client, apply migrations, and seed the trigger/action catalog:

   ```sh
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. In separate terminals, start the API, worker/processor, and frontend:

   ```sh
   npm run server:dev
   npm run kafka:dev
   npm run client:dev
   ```

   Open <http://localhost:3000>. The API health endpoint is <http://localhost:4000/>. Local PostgreSQL is exposed on port `5433` because `5432` is commonly occupied; Kafka uses `9092`.

To build all workspaces after configuring Clerk keys, run `npm run build`.

---

## Core Concepts

### Triggers
Define when a workflow starts — Scheduled task.

### Actions
Tasks that execute after a trigger fires — send an email, call an API, update a database, or automate browser actions.

### Workflows
A chain of triggers and actions connected visually to represent logic flow and data movement.

--- 

## TO-DO

- [ ] Workflow templates & marketplace  
- [ ] Multi-user collaboration  
- [ ] Real-time execution analytics  
- [ ] Webhook triggers & SDK integrations  
- [ ] Advanced execution monitoring  

---

