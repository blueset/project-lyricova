import type { Song } from "lyricova-common/models/Song";
import { Divider } from "../Divider";
import classes from "./Songs.module.scss";
import { formatArtists } from "lyricova-common/frontendUtils/artists";
import { IconButton, Tooltip } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Link } from "../Link";
import { Fragment } from "react";

type ExpandedSong = Song & { videoUrl?: string };
interface ArtistMetaProps {
  song: ExpandedSong;
}

function ArtistMeta({ song }: ArtistMetaProps) {
  if (!song.artists || song.artists.length === 0) {
    return null;
  }
  return (
    <>
      {formatArtists(song.artists, (artists) =>
        artists.map((a, idx) => (
          <Fragment key={a.id}>
            {idx > 0 && ", "}
            <Link href={`/artists/${a.id}`}>
              {a.ArtistOfSong?.customName || a.name}
            </Link>
          </Fragment>
        ))
      )}
    </>
  );
}

interface SongsProps {
  songs: ExpandedSong[];
}

export function Songs({ songs }: SongsProps) {
  if (!songs || songs.length === 0) {
    return null;
  }
  return (
    <>
      <div className={`container verticalPadding ${classes.songs}`}>
        <h2 className={classes.songsTitle}>Song{songs.length > 1 && "s"}</h2>
        {songs.map((song) => (
          <div className={classes.song} key={song.id}>
            <Link
              href={song.videoUrl || `/songs/${song.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <img className={classes.songCover} src={song.coverUrl} />
            </Link>
            <div className={classes.songMeta}>
              <div className={classes.songTitle}>
                <Link href={`/songs/${song.id}`}>{song.name}</Link>
              </div>
              <div className={classes.songArtists}>
                <ArtistMeta song={song} />
              </div>
            </div>
            {song.id > 0 && (
              <div className={classes.songLink}>
                <Tooltip title="See details on VocaDB">
                  <IconButton
                    LinkComponent="a"
                    href={`https://vocadb.net/S/${song.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <OpenInNewIcon />
                  </IconButton>
                </Tooltip>
              </div>
            )}
          </div>
        ))}
      </div>
      <Divider />
    </>
  );
}
