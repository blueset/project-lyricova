import _ from "lodash";
import { builder } from "../builder";
import { TextureRef } from "../types/Texture";
import { TEXTURE_DATA } from "../data/textures";

builder.queryField("randomTexture", (t) =>
  t.field({
    type: TextureRef,
    resolve: () => _.sample(TEXTURE_DATA) ?? TEXTURE_DATA[0],
  }),
);
