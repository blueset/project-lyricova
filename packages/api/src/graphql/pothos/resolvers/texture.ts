import _ from "lodash";
import { builder } from "../builder.js";
import { TextureRef } from "../types/Texture.js";
import { TEXTURE_DATA } from "../data/textures.js";

builder.queryField("randomTexture", (t) =>
  t.field({
    type: TextureRef,
    resolve: () => _.sample(TEXTURE_DATA) ?? TEXTURE_DATA[0],
  }),
);
