import { gql } from "@apollo/client";

export const SongFragments = {
  MusicFileDetails: gql`
    fragment MusicFileDetails on Song {
      id
      name
      sortOrder
      coverPath
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