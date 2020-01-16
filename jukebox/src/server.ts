import errorHandler from "errorhandler";
import "reflect-metadata";
import { createConnection } from "typeorm";

import app from "./app";

/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(errorHandler());

createConnection()
  .then(async connection => {
    /**
     * Start Express server.
     */
    const server = app.listen(app.get("port"), () => {
      console.log(
        "  App is running at http://localhost:%d in %s mode",
        app.get("port"),
        app.get("env")
      );
      console.log("  Press CTRL-C to stop\n");
    });
  })
  .catch(error => console.log(error));

// export default server;
