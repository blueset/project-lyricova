import { Sequelize } from "sequelize-typescript";
import { DB_URI, ENVIRONMENT } from "./utils/secret";
import { sequelizeAdditions } from "./utils/sequelizeAdditions";
import { Album } from "./models/Album";
import { Artist } from "./models/Artist";
import { ArtistOfAlbum } from "./models/ArtistOfAlbum";
import { ArtistOfSong } from "./models/ArtistOfSong";
import { Entry } from "./models/Entry";
import { FileInPlaylist } from "./models/FileInPlaylist";
import { FuriganaMapping } from "./models/FuriganaMapping";
import { MusicFile } from "./models/MusicFile";
import { Playlist } from "./models/Playlist";
import { Pulse } from "./models/Pulse";
import { SiteMeta } from "./models/SiteMeta";
import { Song } from "./models/Song";
import { SongInAlbum } from "./models/SongInAlbum";
import { SongOfEntry } from "./models/SongOfEntry";
import { Tag } from "./models/Tag";
import { TagOfEntry } from "./models/TagOfEntry";
import { User } from "./models/User";
import { UserPublicKeyCredential } from "./models/UserPublicKeyCredential";
import { Verse } from "./models/Verse";
import { VideoFile } from "./models/VideoFile";
import logger from "./utils/logger";

sequelizeAdditions(Sequelize);

// const dirName = __dirname.endsWith();

// Normalize the connection URI for Sequelize's mysql2 dialect. A `ssl=false`
// query param (used to disable TLS) is misread by mysql2 as an SSL *profile*
// named "false" and throws; strip TLS/auth hints from the URI and translate
// them into explicit dialectOptions instead. The Drizzle mysql2 pool parses the
// same URI directly without this normalization.
function buildSequelizeConfig(uri: string): {
  uri: string;
  dialectOptions: Record<string, unknown>;
} {
  try {
    const url = new URL(uri);
    const dialectOptions: Record<string, unknown> = {};
    const ssl = url.searchParams.get("ssl");
    if (ssl !== null) {
      url.searchParams.delete("ssl");
      if (ssl === "false" || ssl === "0") dialectOptions.ssl = undefined;
    }
    if (url.searchParams.has("allowPublicKeyRetrieval")) {
      url.searchParams.delete("allowPublicKeyRetrieval");
    }
    return { uri: url.toString(), dialectOptions };
  } catch {
    return { uri, dialectOptions: {} };
  }
}

const { uri: sequelizeUri, dialectOptions } = buildSequelizeConfig(DB_URI);

const sequelize = new Sequelize(sequelizeUri, {
  models: [
    // __dirname + "/models/*",
    Album,
    Artist,
    ArtistOfAlbum,
    ArtistOfSong,
    Entry,
    FileInPlaylist,
    FuriganaMapping,
    MusicFile,
    Playlist,
    Pulse,
    SiteMeta,
    Song,
    SongInAlbum,
    SongOfEntry,
    Tag,
    TagOfEntry,
    User,
    UserPublicKeyCredential,
    Verse,
    VideoFile,
  ],
  dialectOptions,
  logging: (sql, timing) => logger.debug(sql, timing),
  benchmark: ENVIRONMENT !== "production",
});

(async () => {
  try {
    await sequelize.authenticate();
    // await sequelize.sync({ force: false });
    console.log("Database connection has been established successfully.");
  } catch (err) {
    console.error("Unable to connect to the database:", err);
  }
})();

export default sequelize;
