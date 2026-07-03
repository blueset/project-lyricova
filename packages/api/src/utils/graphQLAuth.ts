import { Request } from "express";
import { User } from "../models/User";

export type ContextType = {
  user?: User;
  req: Request;
};
