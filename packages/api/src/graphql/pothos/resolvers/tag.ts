import { builder } from "../builder";
import { TagRef } from "../types/refs";
import { Tag } from "../../../models/Tag";
import { GraphQLError } from "graphql";

const NewTagInput = builder.inputType("NewTagInput", {
  fields: (t) => ({
    name: t.string(),
    slug: t.string(),
    color: t.string(),
  }),
});

const UpdateTagInput = builder.inputType("UpdateTagInput", {
  fields: (t) => ({
    name: t.string({ required: false }),
    slug: t.string({ required: false }),
    color: t.string({ required: false }),
  }),
});

builder.queryField("tags", (t) =>
  t.field({ type: [TagRef], resolve: () => Tag.findAll() })
);

builder.queryField("tag", (t) =>
  t.field({
    type: TagRef,
    nullable: true,
    args: { slug: t.arg.string() },
    resolve: (_root, { slug }) => Tag.findByPk(slug),
  })
);

builder.mutationField("newTag", (t) =>
  t.field({
    type: TagRef,
    authScopes: { admin: true },
    args: { data: t.arg({ type: NewTagInput }) },
    resolve: (_root, { data }) => Tag.create(data as any),
  })
);

builder.mutationField("updateTag", (t) =>
  t.field({
    type: TagRef,
    authScopes: { admin: true },
    args: { slug: t.arg.string(), data: t.arg({ type: UpdateTagInput }) },
    resolve: async (_root, { slug, data }) => {
      const tag = await Tag.findByPk(slug);
      if (!tag) {
        throw new GraphQLError(`Tag ${slug} not found in database.`);
      }
      await Tag.update(data as any, { where: { slug } });
      return Tag.findByPk(data.slug ?? slug);
    },
  })
);

builder.mutationField("deleteTag", (t) =>
  t.boolean({
    authScopes: { admin: true },
    args: { slug: t.arg.string() },
    resolve: async (_root, { slug }) => {
      const tag = await Tag.findByPk(slug);
      if (!tag) {
        throw new GraphQLError(`Tag ${slug} not found in database.`);
      }
      await tag.destroy();
      return true;
    },
  })
);
