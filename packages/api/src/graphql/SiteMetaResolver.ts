import { Resolver, Query, Mutation, Arg, Authorized } from "type-graphql";
import { SiteMeta } from "../models/SiteMeta";

@Resolver()
export class SiteMetaResolver {
  @Query(() => String)
  public async getSiteMeta(
    @Arg("key") key: string,
    @Arg("default") defaultValue: string
  ): Promise<string> {
    const siteMeta = await SiteMeta.findByPk(key);
    return siteMeta?.value ?? defaultValue;
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  public async setSiteMeta(
    @Arg("key") key: string,
    @Arg("value") value: string
  ): Promise<boolean> {
    try {
      await SiteMeta.upsert({
        key,
        value,
      });
      return true;
    } catch (error) {
      console.error("Error setting site meta:", error);
      return false;
    }
  }
}
