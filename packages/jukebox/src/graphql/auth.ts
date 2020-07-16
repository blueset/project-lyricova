import { AuthChecker } from "type-graphql";
import { User } from "../models/User";
import { Request } from "express";

export type ContextType = {
  user?: User;
  req: Request;
};

export const authChecker: AuthChecker<ContextType> = ({ context }, roles) => {
  if (roles.indexOf("ADMIN") >= 0) {
    console.log("context.user", context.user);
    if (context.user !== null && context.user !== undefined) {
      return context.user.role === "admin";
    }
    return false;
  }

  return true;
};