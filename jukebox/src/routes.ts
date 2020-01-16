import { UserController } from "./controller/UserController";
import express from "express";

const userRouter = express.Router();
const userController = new UserController();

userRouter.get("/users", userController.all);
userRouter.get("/users/:id", userController.one);
userRouter.post("/users", userController.save);
userRouter.delete("/users/:id", userController.remove);

export { userRouter };
