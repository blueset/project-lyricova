import React from "react";
import type { ReactNode } from "react";

/**
 * Minimal structural shape the artist formatters depend on. Kept generic so
 * callers (GraphQL fragment results, VocaDB-derived objects, …) keep their own
 * element type through to the `renderer` callback.
 */
interface ArtistLike {
  ArtistOfSong?: {
    categories?: readonly string[] | null;
    isSupport?: boolean | null;
  } | null;
  ArtistOfAlbum?: {
    categories?: string | readonly string[] | null;
  } | null;
}

function splitArtists<T extends ArtistLike>(
  artists: T[],
): {
  producers: T[];
  vocalists: T[];
} {
  const producers: T[] = [],
    vocalists: T[] = [];

  for (const i of artists) {
    const categories = i?.ArtistOfSong?.categories || [
      i.ArtistOfAlbum?.categories,
    ];
    if (
      (categories.indexOf("Producer") >= 0 ||
        categories.indexOf("Circle") >= 0) &&
      !(i?.ArtistOfSong?.isSupport ?? false)
    ) {
      producers.push(i);
    }
    if (
      categories.indexOf("Vocalist") >= 0 &&
      !(i?.ArtistOfSong?.isSupport ?? false)
    ) {
      vocalists.push(i);
    }
  }

  return { producers, vocalists };
}

export function formatArtists<T extends ArtistLike>(
  artists: T[],
  renderer: (artists: T[], isProducer: boolean) => ReactNode,
): ReactNode {
  const { producers, vocalists } = splitArtists(artists);

  if (producers.length && vocalists.length) {
    return (
      <>
        {renderer(producers, true)}
        {" feat. "}
        {renderer(vocalists, false)}
      </>
    );
  } else if (producers.length || vocalists.length) {
    const list = producers.length ? producers : vocalists;
    return <>{renderer(list, !!producers.length)}</>;
  } else {
    return <em className="text-muted-foreground">Various artists</em>;
  }
}

export function formatArtistsString<T extends ArtistLike & { name: string }>(
  artists: T[],
): string {
  const { producers, vocalists } = splitArtists(artists);

  if (producers.length && vocalists.length) {
    return `${producers.map((i) => i.name).join(", ")} feat. ${vocalists
      .map((i) => i.name)
      .join(", ")}`;
  } else if (producers.length || vocalists.length) {
    const list = producers.length ? producers : vocalists;
    return list.map((i) => i.name).join(", ");
  } else {
    return "Various artists";
  }
}

export function formatArtistsPlainText<T extends ArtistLike & { name: string }>(
  artists: T[],
): ReactNode {
  return formatArtists(artists, (v) => v.map((i) => i.name).join(", "));
}
