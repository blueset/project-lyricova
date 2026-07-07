import type { Request } from "express";
import type { User } from "../models/User";

export type ContextType = {
  user?: User;
  req: Request;
};
