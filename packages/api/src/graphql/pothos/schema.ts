import { builder } from "./builder.js";

// Type modules (register object/input/enum types on the builder).
import "./types/Texture.js";
import "./types/User.js";
import "./types/Transliteration.js";
import "./types/leaf.js";
import "./types/entities.js";
import "./types/MusicFile.js";
import "./types/Playlist.js";
import "./types/Entry.js";
import "./types/Tag.js";
import "./types/pagination.js";
import "./types/lyricsKit.js";
import "./types/download.js";

// Resolver modules (attach query/mutation/subscription fields).
import "./resolvers/texture.js";
import "./resolvers/stats.js";
import "./resolvers/siteMeta.js";
import "./resolvers/user.js";
import "./resolvers/transliteration.js";
import "./resolvers/llm.js";
import "./resolvers/tag.js";
import "./resolvers/artist.js";
import "./resolvers/vocadbImport.js";
import "./resolvers/album.js";
import "./resolvers/song.js";
import "./resolvers/entry.js";
import "./resolvers/musicFile.js";
import "./resolvers/playlist.js";
import "./resolvers/lyricsProviders.js";
import "./resolvers/download.js";
import "./resolvers/subscriptions.js";
import "./resolvers/foo.js";

/**
 * Builds the Pothos `GraphQLSchema` from the type/resolver modules imported
 * above. The emitted SDL is kept in sync with the committed `schema.graphql`
 * (`npm run pothos:emit`); Apollo consumes this schema in `applyApollo`.
 */
export function buildPothosSchema() {
  return builder.toSchema();
}
