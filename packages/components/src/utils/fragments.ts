import { graphql } from "../gql";

export const SelectSongEntryFragmentDoc = graphql(`
  fragment SelectSongEntry on Song {
    id
    utaiteDbId
    name
    sortOrder
    coverUrl
    original {
      id
      name
      sortOrder
      coverUrl
    }
    artists {
      id
      utaiteDbId
      name
      sortOrder
      mainPictureUrl
      type
      ArtistOfSong {
        artistOfSongId
        isSupport
        customName
        artistRoles
        categories
      }
    }
    albums {
      id
      utaiteDbId
      name
      sortOrder
      coverUrl
      SongInAlbum {
        diskNumber
        trackNumber
        name
      }
    }
  }
`);

export const SelectArtistEntryFragmentDoc = graphql(`
  fragment SelectArtistEntry on Artist {
    id
    utaiteDbId
    name
    sortOrder
    type
    mainPictureUrl
  }
`);

export const SelectAlbumEntryFragmentDoc = graphql(`
  fragment SelectAlbumEntry on Album {
    id
    utaiteDbId
    name
    sortOrder
    coverUrl
  }
`);

export const FullAlbumEntryFragmentDoc = graphql(`
  fragment FullAlbumEntry on Album {
    id
    utaiteDbId
    name
    sortOrder
    coverUrl

    songs {
      id
      utaiteDbId
      name
      sortOrder
      coverUrl

      artists {
        id
        utaiteDbId
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

      SongInAlbum {
        diskNumber
        trackNumber
        name
      }
    }

    artists {
      id
      utaiteDbId
      name
      sortOrder
      type
      ArtistOfAlbum {
        roles
        effectiveRoles
        categories
      }
    }
  }
`);

export const MusicFileForPlaylistAttributesFragmentDoc = graphql(`
  fragment MusicFileForPlaylistAttributes on MusicFile {
    id
    fileSize
    trackName
    trackSortOrder
    artistName
    artistSortOrder
    albumName
    albumSortOrder
    hasCover
    duration
    hasLyrics
  }
`);
