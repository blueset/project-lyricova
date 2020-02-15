import errorHandler from "errorhandler";
import "reflect-metadata";

import App from "./app";
const app = App();

/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(errorHandler());

const server = app.listen(app.get("port"), async () => {
  console.log(
    "  App is running at http://localhost:%d in %s mode",
    app.get("port"),
    app.get("env")
  );
  console.log("  Press CTRL-C to stop\n");
});

// export default server;
