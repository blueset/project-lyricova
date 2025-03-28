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

const sequelize = new Sequelize(DB_URI, {
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
