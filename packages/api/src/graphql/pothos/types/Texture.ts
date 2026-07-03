import { builder } from "../builder";

export interface TextureShape {
  name: string;
  author: string;
  authorUrl?: string | null;
  url: string;
}

export const TextureRef = builder.objectRef<TextureShape>("Texture");

TextureRef.implement({
  fields: (t) => ({
    author: t.exposeString("author"),
    authorUrl: t.exposeString("authorUrl", { nullable: true }),
    name: t.exposeString("name"),
    url: t.exposeString("url"),
  }),
});
