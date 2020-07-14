import { AuthChecker } from "type-graphql";
import { Request } from "apollo-server-express";

export type ContextType = {
  user?: {};
  req: Request;
};

export const authChecker: AuthChecker<ContextType> = (
  { root, args, context, info },
  roles,
) => {
  console.log("Context", context);
  console.log("root", root);
  console.log("args", args);
  console.log("info", info);
  console.log("roles", roles);
  // here we can read the user from context
  // and check his permission in the db against the `roles` argument
  // that comes from the `@Authorized` decorator, eg. ["ADMIN", "MODERATOR"]

  return true; // or false if access is denied
};