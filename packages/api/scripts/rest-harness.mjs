// Minimal REST harness: mounts registerRoutes on a bare Express app for endpoint
// diffing (Sequelize baseline vs Drizzle). Listens on 127.0.0.1:9099.
import "reflect-metadata";
import express from "express";
import bodyParser from "body-parser";
import routesModule from "../dist/routes.js";
const registerRoutes = routesModule.default ?? routesModule;

const app = express();
app.use(bodyParser.json());
// Stub an admin user so admin-guarded read paths work without passport.
app.use((req, _res, next) => {
  req.user = { id: 1, role: "admin" };
  next();
});
registerRoutes(app);
const server = app.listen(9099, "127.0.0.1", () => {
  console.log("REST harness on 9099");
});
process.on("SIGTERM", () => server.close());
