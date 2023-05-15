import { Resolver, Query, Ctx, Int, Mutation, Arg } from "type-graphql";
import type { ContextType } from "lyricova-common/utils/graphQLAuth";
import { UserPublicKeyCredential } from "lyricova-common/models/UserPublicKeyCredential";

@Resolver()
export class UserPublicKeyCredentialResolver {
  @Query((returns) => [UserPublicKeyCredential])
  public async currentCredentials(
    @Ctx() ctx: ContextType
  ): Promise<UserPublicKeyCredential[]> {
    if (!ctx.user) return [];
    const creds = await UserPublicKeyCredential.findAll({
      attributes: ["id", "creationDate", "remarks"],
      where: { userId: ctx.user.id },
    });
    return creds.map((i) => i.toJSON());
  }

  @Mutation((returns) => Boolean)
  public async deleteCredential(
    @Ctx() ctx: ContextType,
    @Arg("id", (type) => Int) id: number
  ): Promise<boolean> {
    if (!ctx.user) return false;
    const cred = await UserPublicKeyCredential.findOne({
      where: { id, userId: ctx.user.id },
    });
    if (!cred) return false;
    await cred.destroy();
    return true;
  }
}
