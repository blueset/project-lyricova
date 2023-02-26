import {
  Arg,
  Authorized,
  Field,
  FieldResolver,
  InputType,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { Tag } from "lyricova-common/models/Tag";
import { Entry } from "lyricova-common/models/Entry";
import { UserInputError } from "apollo-server-express";

@InputType()
class NewTagInput implements Partial<Tag> {
  @Field()
  name: string;

  @Field()
  slug: string;

  @Field()
  color: string;
}

@InputType()
class UpdateTagInput implements Partial<Tag> {
  @Field({ nullable: true })
  name: string;

  @Field({ nullable: true })
  slug: string;

  @Field({ nullable: true })
  color: string;
}

@Resolver((of) => Tag)
export class TagResolver {
  @Query((returns) => [Tag])
  public async tags(): Promise<Tag[]> {
    return await Tag.findAll();
  }

  @Query((returns) => Tag, { nullable: true })
  public async tag(@Arg("slug") slug: string): Promise<Tag> {
    return await Tag.findByPk(slug);
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Tag)
  public async newTag(@Arg("data") data: NewTagInput): Promise<Tag> {
    return await Tag.create(data);
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Tag)
  public async updateTag(
    @Arg("slug") slug: string,
    @Arg("data") data: UpdateTagInput
  ): Promise<Tag> {
    const tag = await Tag.findByPk(slug);
    if (!tag) {
      throw new UserInputError(`Tag ${slug} not found in database.`);
    }
    await Tag.update(data, { where: { slug } });
    return await Tag.findByPk(data.slug);
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Boolean)
  public async deleteTag(@Arg("slug") slug: string): Promise<boolean> {
    const tag = await Tag.findByPk(slug);
    if (!tag) {
      throw new UserInputError(`Tag ${slug} not found in database.`);
    }
    await tag.destroy();
    return true;
  }

  @FieldResolver((type) => [Entry])
  public async entries(@Root() tag: Tag): Promise<Entry[]> {
    return tag.$get("entries");
  }
}
