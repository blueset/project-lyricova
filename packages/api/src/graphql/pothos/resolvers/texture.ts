import { builder } from "../builder";
import { TextureRef } from "../types/Texture";

// NOTE (Phase 2 port): the 397-entry TEXTURE_DATA currently lives inside the
// TypeGraphQL TextureResolver. It will be extracted to a plain data module and
// imported here (`_.sample(TEXTURE_DATA)`). Placeholder resolve below keeps the
// emitted SDL correct while the data move is pending.
builder.queryField("randomTexture", (t) =>
  t.field({
    type: TextureRef,
    resolve: () => ({
      name: "3Px Tile",
      author: "Gre3g",
      authorUrl: "http://gre3g.livejournal.com/",
      url: "3px-tile.png",
    }),
  })
);
