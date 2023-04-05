import type { ReactNode } from "react";
import React from "react";
import { getLayout as getDashboardLayout } from "./DashboardLayout";
import { gql, useApolloClient, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import EditIcon from "@mui/icons-material/Edit";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { Song } from "lyricova-common/models/Song";
import { useRouter } from "next/router";
import { formatArtistsPlainText } from "lyricova-common/frontendUtils/artists";
import { Avatar, ListItemText, Tooltip } from "@mui/material";
import GetAppIcon from "@mui/icons-material/GetApp";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import { DataGridToolbar } from "lyricova-common/components/DataGridToolbar";

const SONG_INFO_LIST_QUERY = gql`
  query {
    songs {
      id
      name
      sortOrder
      artists {
        id
        name
        ArtistOfSong {
          categories
          artistRoles
        }
      }
      incomplete
      coverUrl
    }
  }
`;

const SONG_OVERWRITE_MUTATION = gql`
  mutation($id: Int!) {
    enrolSongFromVocaDB(songId: $id) {
      id
      name
      sortOrder
      artists {
        id
        name
        ArtistOfSong {
          categories
        }
      }
      incomplete
      coverUrl
    }
  }
`;

interface Props {
  children: ReactNode;
}

export default function SongInfoLayout({ children }: Props) {
  const router = useRouter();
  const apolloClient = useApolloClient();
  const query = useQuery<{ songs: Song[] }>(SONG_INFO_LIST_QUERY);

  let table: ReactNode = null;
  if (query.loading) table = <Alert severity="info">Loading...</Alert>;
  else if (query.error)
    table = <Alert severity="error">Error: {`${query.error}`}</Alert>;
  else if (query.data) {
    const rows = query.data.songs.map((v) => ({ ...v }));
    table = (
      <DataGrid
        columns={[
          { headerName: "ID", field: "id", width: 125 },
          // eslint-disable-next-line react/display-name
          {
            headerName: "Cover",
            field: "coverUrl",
            width: 75,
            renderCell: ({ row: r }) => (
              <Avatar variant="rounded" src={r.coverUrl}>
                {r.name[0]}
              </Avatar>
            ),
          },
          // eslint-disable-next-line react/display-name
          {
            headerName: "Song name",
            field: "name",
            renderCell: ({ row: r }) => (
              <ListItemText primary={r.name} secondary={r.sortOrder} />
            ),
            flex: 1,
          },
          {
            headerName: "Artists",
            field: "artists",
            renderCell: ({ row: r }) => formatArtistsPlainText(r.artists),
            flex: 1,
          },
          {
            headerName: "Incomplete",
            field: "incomplete",
            type: "boolean",
            width: 100,
          },
          {
            field: "actions",
            type: "actions",
            width: 100,
            getActions: (rowData) => [
              <Tooltip title="Edit" key="Edit">
                <GridActionsCellItem
                  icon={<EditIcon />}
                  label="Edit"
                  onClick={async () => {
                    if (rowData?.id !== undefined) {
                      await router.push(`/dashboard/songs/${rowData.id}`);
                    }
                  }}
                />
              </Tooltip>,
              <Tooltip title="View in VocaDB" key="ViewInVocaDB">
                <GridActionsCellItem
                  icon={<OpenInNewIcon />}
                  label="View in VocaDB"
                  disabled={(rowData?.id ?? -1) < 0}
                  onClick={async () => {
                    if (rowData?.id !== undefined) {
                      window.open(
                        `https://vocadb.net/S/${rowData.id}`,
                        "_blank"
                      );
                    }
                  }}
                />
              </Tooltip>,
              <Tooltip title="Overwrite from VocaDB" key="OverwriteFromVocaDB">
                <GridActionsCellItem
                  icon={<GetAppIcon />}
                  label="Overwrite from VocaDB"
                  disabled={(rowData?.id ?? -1) < 0}
                  onClick={async () => {
                    if (rowData?.id !== undefined) {
                      const result = await apolloClient.mutate<{
                        enrolSongFromVocaDB: Song;
                      }>({
                        mutation: SONG_OVERWRITE_MUTATION,
                        variables: { id: rowData.id },
                      });
                      if (result.data.enrolSongFromVocaDB) {
                        const updated = result.data.enrolSongFromVocaDB;
                        query.updateQuery((prev) => ({
                          songs: prev.songs.map((v) =>
                            v.id === updated.id ? updated : v
                          ),
                        }));
                      }
                    }
                  }}
                />
              </Tooltip>,
            ],
          },
        ]}
        rows={rows}
        components={{ Toolbar: DataGridToolbar }}
        componentsProps={{
          toolbar: {
            title: `${rows.length} song entities.`,
          },
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 7em)", height: 0 }}>
      {table}
      {children}
    </div>
  );
}

// eslint-disable-next-line react/display-name, @typescript-eslint/explicit-module-boundary-types
export const getLayout = (page: ReactNode) =>
  getDashboardLayout("Song entities")(<SongInfoLayout>{page}</SongInfoLayout>);
