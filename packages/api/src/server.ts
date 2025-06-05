import errorHandler from "errorhandler";
import "reflect-metadata";

import App from "./app";
import { applyApollo } from "./graphql/index";
import { postHog } from "./utils/posthog";

(async () => {
  const app = await App();

  app.enable("trust proxy");

  const httpServer = await applyApollo(app);

  app.use(errorHandler());

  // Graceful shutdown handling
  const gracefulShutdown = (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    postHog?.shutdown();

    httpServer.close((err) => {
      if (err) {
        console.error("Error during server shutdown:", err);
        process.exit(1);
      }

      console.log("HTTP server closed.");

      // Close database connections if any
      // Add any other cleanup logic here (close Redis connections, etc.)

      console.log("Graceful shutdown complete.");
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error("Forcing shutdown after timeout");
      process.exit(1);
    }, 30000);
  };

  // Handle various shutdown signals
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2")); // nodemon restart

  // Handle uncaught exceptions and unhandled rejections
  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    gracefulShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("unhandledRejection");
  });

  httpServer.listen(app.get("port"), () => {
    console.log(
      "  App is running at http://localhost:%d in %s mode",
      app.get("port"),
      app.get("env")
    );
    console.log("  Press CTRL-C to stop\n");
  });
})();
