import { Artist } from "../models/Artist";
import { ReactNode } from "react";

function splitArtists(artists: Artist[]): {producers: Artist[], vocalists: Artist[]} {
  const producers: Artist[] = [], vocalists: Artist[] = [];

  for (const i of artists) {
    const categories = i?.ArtistOfSong?.categories || [i.ArtistOfAlbum?.categories];
    if (categories.indexOf("Producer") >= 0 || categories.indexOf("Circle") >= 0) {
      producers.push(i);
    } else if (categories.indexOf("Vocalist") >= 0) {
      vocalists.push(i);
    }
  }

  return {producers, vocalists};
}

export function formatArtists(artists: Artist[], renderer: (artists: Artist[]) => ReactNode): ReactNode {
  const { producers, vocalists } = splitArtists(artists);

  if (producers.length && vocalists.length) {
    return <>{renderer(producers)}{" feat. "}{renderer(vocalists)}</>;
  } else if (producers.length || vocalists.length) {
    const list = producers.length ? producers : vocalists;
    return <>{renderer(list)}</>;
  } else {
    return <em>Various artists</em>;
  }
}

export function formatArtistsString(artists: Artist[]): string {
  const { producers, vocalists } = splitArtists(artists);

  if (producers.length && vocalists.length) {
    return `${producers.map(i => i.name).join(", ")} feat. ${vocalists.map(i => i.name).join(", ")}`;
  } else if (producers.length || vocalists.length) {
    const list = producers.length ? producers : vocalists;
    return list.map(i => i.name).join(", ");
  } else {
    return "Various artists";
  }
}

export function formatArtistsPlainText(artists: Artist[]): ReactNode {
  return formatArtists(artists, v => v.map(i => i.name).join(", "));
}
