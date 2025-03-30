import { gql } from "@apollo/client";

export const SongFragments = {
  SelectSongEntry: gql`
    fragment SelectSongEntry on Song {
      id
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
  FullAlbumEntry: gql`
    fragment FullAlbumEntry on Album {
      id
      name
      sortOrder
      coverUrl

      songs {
        id
        name
        sortOrder
        coverUrl

        artists {
          id
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
  `,
};

export const MusicFileFragments = {
  MusicFileForPlaylistAttributes: gql`
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
  `,
};
