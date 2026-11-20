import initServer from "./app";
import * as dotenv from "dotenv";
import path from "path";
import { altairExpress } from "altair-express-middleware";

dotenv.config({ path: path.resolve(__dirname, "../../..", ".env") });

async function init() {
  const { app, httpServer } = await initServer(); 

  app.use(
    "/altair",
    altairExpress({
      endpointURL: "/graphql",
      subscriptionsEndpoint: `ws://localhost:4000/subscriptions`,
    })
  );

  const PORT = Number(process.env.PORT || 4000);
  const host =
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_AUTH_BYPASS === "true"
      ? "127.0.0.1"
      : undefined;

  const onListen = () => {
    console.log(`🚀 GraphQL HTTP: http://localhost:${PORT}/graphql`);
    console.log(`📡 Subscriptions WS: ws://localhost:${PORT}/subscriptions`);
    console.log(`🧪 Altair Playground: http://localhost:${PORT}/altair`);
  };

  if (host) {
    httpServer.listen(PORT, host, onListen);
  } else {
    httpServer.listen(PORT, onListen);
  }
  
}

init();
