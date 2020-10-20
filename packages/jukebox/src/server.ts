import errorHandler from "errorhandler";
import "reflect-metadata";

import App from "./app";
import next from "next";
import { applyApollo } from "./graphql";

(async () => {
  const app = await App();
  const apolloServer = await applyApollo(app);
  const nextApp = next({ dev: app.get("env") === "development" });
  const nextHandler = nextApp.getRequestHandler();

  await nextApp.prepare();

  /**
   * Error Handler. Provides full stack - remove for production
   */
  app.use(errorHandler());

  app.all("*", (req, res) => { return nextHandler(req, res); });

  const server = app.listen(app.get("port"), async () => {
    console.log(
      "  App is running at http://localhost:%d in %s mode",
      app.get("port"),
      app.get("env")
    );
    console.log("  Press CTRL-C to stop\n");
    apolloServer.installSubscriptionHandlers(server);
    console.log(`🚀 Server ready at http://localhost:${app.get("port")}${apolloServer.graphqlPath}`);
    console.log(`🚀 Subscriptions ready at ws://localhost:${app.get("port")}${apolloServer.subscriptionsPath}`);
  });

  // export default server;
})();