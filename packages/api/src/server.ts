import errorHandler from "errorhandler";
import "reflect-metadata";

import App from "./app";
import { applyApollo } from "./graphql/index";

(async () => {
  const app = await App();

  app.enable("trust proxy");

  const httpServer = await applyApollo(app);

  app.use(errorHandler());

  const server = httpServer.listen(app.get("port"), () => {
    console.log(
      "  App is running at http://localhost:%d in %s mode",
      app.get("port"),
      app.get("env")
    );
    console.log("  Press CTRL-C to stop\n");
  });
})();
