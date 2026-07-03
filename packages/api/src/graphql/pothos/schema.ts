import { builder } from "./builder";

// Type modules (register object/input/enum types on the builder).
import "./types/Texture";
import "./types/User";
import "./types/Transliteration";
import "./types/leaf";
import "./types/entities";
import "./types/MusicFile";
import "./types/Playlist";
import "./types/Entry";
import "./types/Tag";
import "./types/pagination";
import "./types/lyricsKit";
import "./types/download";

// Resolver modules (attach query/mutation/subscription fields).
import "./resolvers/texture";
import "./resolvers/stats";
import "./resolvers/siteMeta";
import "./resolvers/user";
import "./resolvers/transliteration";
import "./resolvers/llm";
import "./resolvers/tag";
import "./resolvers/artist";
import "./resolvers/vocadbImport";
import "./resolvers/album";
import "./resolvers/song";
import "./resolvers/entry";
import "./resolvers/musicFile";
import "./resolvers/playlist";
import "./resolvers/lyricsProviders";
import "./resolvers/download";
import "./resolvers/subscriptions";
import "./resolvers/foo";

/**
 * Builds the Pothos `GraphQLSchema` from the type/resolver modules imported
 * above. The emitted SDL is kept at full parity with `schema.graphql`
 * (`npm run schema:check`); Apollo consumes this schema in `applyApollo`.
 */
export function buildPothosSchema() {
  return builder.toSchema();
}
