import { Artist } from "../models/Artist";
import { ReactNode } from "react";

export function formatArtists(artists: Artist[], renderer: (artists: Artist[]) => ReactNode): ReactNode {
  const producers: Artist[] = [], vocalists: Artist[] = [];
  for (const i of artists) {
    const categories = i?.ArtistOfSong?.categories || [i.ArtistOfAlbum?.categories];
    if (categories.indexOf("Producer") >= 0 || categories.indexOf("Circle") >= 0) {
      producers.push(i);
    } else if (categories.indexOf("Vocalist") >= 0) {
      vocalists.push(i);
    }
  }
  if (producers.length && vocalists.length) {
    return <>{renderer(producers)} feat. {renderer(vocalists)}</>;
  } else if (producers.length || vocalists.length) {
    return <>{renderer(producers || vocalists)}</>;
  } else {
    return <em>Various artists</em>;
  }
}

export function formatArtistsPlainText(artists: Artist[]) {
  return formatArtists(artists, v => v.map(i => i.name).join(", "));
}
