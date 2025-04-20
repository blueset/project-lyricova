"use client";

import React, { Fragment } from "react";
import {
  useAuthContext,
  formatArtistsPlainText,
  NextComposedLink,
} from "@lyricova/components";
import { MoreVertical } from "lucide-react";
import type { MusicFile } from "@lyricova/api/graphql/types";
import type { Song } from "@lyricova/api/graphql/types";
import ListItemTextWithTime from "./ListItemTextWithTime";
import {
  playTrack,
  addTrackToNext,
  loadTracks,
} from "../../../redux/public/playlist";
import { useAppDispatch } from "../../../redux/public/store";
import { Button } from "@lyricova/components/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import { cn } from "@lyricova/components/utils";
import { Separator } from "@lyricova/components/components/ui/separator";

interface Props {
  song: Song | null;
  file: MusicFile | null;
  files: MusicFile[];
  showAlbum?: boolean;
}

export default function TrackListRow({ song, file, files, showAlbum }: Props) {
  const { user } = useAuthContext();
  const dispatch = useAppDispatch();
  const id = song ? song.id : file.id;
  const showTrackNumber = song && song.SongInAlbum !== undefined;

  const handlePlayNext = () => {
    dispatch(addTrackToNext(file));
  };
  const handlePlayInList = () => {
    dispatch(loadTracks(files));
    dispatch(playTrack({ track: files.indexOf(file), playNow: true }));
  };

  return (
    <Fragment key={id}>
      <div className="flex items-center justify-between py-2 ">
        <div
          className={cn(
            "flex flex-1 items-center text-left",
            file === null && "text-muted-foreground"
          )}
        >
          {showTrackNumber && (
            <div className="mr-4 w-6">
              {song?.SongInAlbum.trackNumber ?? "?"}
            </div>
          )}
          <ListItemTextWithTime
            primary={song ? song.name : file.trackName}
            secondary={
              <>
                {(song
                  ? formatArtistsPlainText(song.artists)
                  : file.artistName) || <em>Various Artists</em>}
                {showAlbum && file && (
                  <>
                    {" / "}
                    {(file.album?.name ?? file.albumName) || (
                      <em>Unknown album</em>
                    )}
                  </>
                )}
              </>
            }
            time={file?.duration ?? null}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={!file} onClick={handlePlayNext}>
              Play next
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!file} onClick={handlePlayInList}>
              Play in the playlist
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!file} asChild>
              <NextComposedLink href={`/info/${file?.id}`}>
                Show details
              </NextComposedLink>
            </DropdownMenuItem>
            {user && (
              <DropdownMenuItem disabled={!file} asChild>
                <NextComposedLink
                  href={`/dashboard/review/${file?.id}`}
                  target="_blank"
                >
                  Edit music file entry
                </NextComposedLink>
              </DropdownMenuItem>
            )}
            {user && (
              <DropdownMenuItem disabled={!song} asChild>
                <NextComposedLink
                  href={`/dashboard/songs/${song?.id}`}
                  target="_blank"
                >
                  Edit song entity
                </NextComposedLink>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Separator
        className={
          showTrackNumber
            ? "ml-10 box-border data-[orientation=horizontal]:w-[calc(100%_-_2.5rem)]"
            : ""
        }
      />
    </Fragment>
  );
}
