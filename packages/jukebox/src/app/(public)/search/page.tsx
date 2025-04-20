"use client";

import { useNamedState } from "@/hooks/useNamedState";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import React, { useCallback } from "react";
import { gql, useLazyQuery } from "@apollo/client";
import { MusicFileFragments } from "@lyricova/components";
import type { MusicFile } from "@lyricova/api/graphql/types";
import TrackListRow from "@/components/public/library/TrackListRow";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@lyricova/components/components/ui/input";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";

const MUSIC_FILE_SEARCH_QUERY = gql`
  query ($keywords: String!) {
    searchMusicFiles(keywords: $keywords) {
      ...MusicFileForPlaylistAttributes
    }
  }

  ${MusicFileFragments.MusicFileForPlaylistAttributes}
`;

export default function Search() {
  const [searchKeyword, setSearchKeyword] = useNamedState("", "searchKeyword");

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchKeyword(event.target.value);
    },
    [setSearchKeyword]
  );

  const [searchFiles, searchFilesQuery] = useLazyQuery<{
    searchMusicFiles: MusicFile[];
  }>(MUSIC_FILE_SEARCH_QUERY);

  const handleSearch = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      await searchFiles({ variables: { keywords: searchKeyword } });
      return false;
    },
    [searchKeyword, searchFiles]
  );

  let content: ReactNode;
  if (!searchFilesQuery.called) content = null;
  else if (searchFilesQuery.loading)
    content = (
      <Alert variant="info">
        <AlertDescription>Loading...</AlertDescription>
      </Alert>
    );
  else if (searchFilesQuery.error)
    content = (
      <Alert variant="error">
        <AlertDescription>
          Error: {`${searchFilesQuery.error}`}
        </AlertDescription>
      </Alert>
    );
  else if (searchFilesQuery.data.searchMusicFiles.length < 1)
    content = (
      <Alert variant="info">
        <AlertDescription>No result found.</AlertDescription>
      </Alert>
    );
  else {
    content = searchFilesQuery.data.searchMusicFiles.map((v) => (
      <TrackListRow
        song={null}
        file={v}
        files={searchFilesQuery.data.searchMusicFiles}
        key={v.id}
        showAlbum
      />
    ));
  }

  return (
    <div className="p-4 pt-0">
      <form onSubmit={handleSearch} className="sticky top-1 z-10">
        <div className="relative">
          <Input
            value={searchKeyword}
            placeholder="Search keywords"
            className="backdrop-blur-lg text-4xl md:text-4xl h-16 py-6 px-4 border-primary"
            onChange={handleChange}
          />
          <Button
            type="submit"
            aria-label="search"
            variant="ghostBright"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <SearchIcon />
          </Button>
        </div>
      </form>
      <div className="mt-4">{content}</div>
    </div>
  );
}
