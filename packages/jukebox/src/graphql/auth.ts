import { AuthChecker } from "type-graphql";
import { User } from "../models/User";
import { Request } from "express";

export type ContextType = {
  user?: User;
  req: Request;
};

export const authChecker: AuthChecker<ContextType> = ({ context }, roles) => {
  if (context.user ?? false) {
    if (roles.indexOf("ADMIN") >= 0) {
      return context.user.role === "admin";
    }
    return true;
  }
  return false;
};