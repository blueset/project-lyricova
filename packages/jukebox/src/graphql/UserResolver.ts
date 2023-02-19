import { Resolver, Query, Ctx } from "type-graphql";
import { ContextType } from "./auth";
import { User } from "lyricova-common/models/User";

@Resolver()
export class UserResolver {
  @Query((returns) => User, { nullable: true })
  public async currentUser(@Ctx() ctx: ContextType): Promise<User | null> {
    return ctx.user;
  }
}
