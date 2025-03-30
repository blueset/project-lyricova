import { Resolver, Query, Ctx } from "type-graphql";
import type { ContextType } from "../utils/graphQLAuth";
import { User } from "../models/User";

@Resolver()
export class UserResolver {
  @Query((returns) => User, { nullable: true })
  public async currentUser(@Ctx() ctx: ContextType): Promise<User | null> {
    return ctx.user;
  }
}
