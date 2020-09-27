import { gql } from "@apollo/client";

export const SongFragments = {
  SelectSongEntry: gql`
    fragment SelectSongEntry on Song {
      id
      name
      sortOrder
      coverUrl
      artists {
        name
        sortOrder
        type
        ArtistOfSong {
          isSupport
          customName
          artistRoles
          categories
        }
      }
    }
  `,
};

export const ArtistFragments = {
  SelectArtistEntry: gql`
    fragment SelectArtistEntry on Artist {
      id
      name
      sortOrder
      type
      mainPictureUrl
    }
  `,
};


export const AlbumFragments = {
  SelectAlbumEntry: gql`
    fragment SelectAlbumEntry on Album {
      id
      name
      sortOrder
      coverUrl
    }
  `,
};