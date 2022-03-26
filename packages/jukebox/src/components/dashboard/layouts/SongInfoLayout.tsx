import React, { ReactNode } from "react";
import { getLayout as getDashboardLayout } from "./DashboardLayout";
import { gql, useApolloClient, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import { TableIcons } from "../MaterialTableIcons";
import EditIcon from "@mui/icons-material/Edit";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import MaterialTable from "@material-table/core";
import { Song } from "../../../models/Song";
import { useRouter } from "next/router";
import { formatArtistsPlainText } from "../../../frontendUtils/artists";
import { Avatar, ListItemText } from "@mui/material";
import GetAppIcon from "@mui/icons-material/GetApp";
import { Artist } from "../../../models/Artist";

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
  const query = useQuery<{songs: Song[]}>(SONG_INFO_LIST_QUERY);

  let table: ReactNode = null;
  if (query.loading) table = <Alert severity="info">Loading...</Alert>;
  else if (query.error) table = <Alert severity="error">Error: {`${query.error}`}</Alert>;
  else if (query.data) {
    const rows = query.data.songs.map(v => ({...v}));

    table = <MaterialTable
      title={`${rows.length} song entities.`}
      columns={[
        {title: "ID", field: "id", width: "3em",},
        // eslint-disable-next-line react/display-name
        {title: "Cover", field: "coverUrl", width: "3em", render: r => <Avatar variant="rounded" src={r.coverUrl}>{r.name[0]}</Avatar>},
        // eslint-disable-next-line react/display-name
        {title: "Song name", field: "name", render: r => <ListItemText primary={r.name} secondary={r.sortOrder} />},
        {title: "Artists", field: "artists", render: r => formatArtistsPlainText(r.artists)},
        {title: "Incomplete", field: "incomplete", type: "boolean", width: "2em",},
      ]}
      data={rows}
      icons={TableIcons}
      actions={[
        {
          // eslint-disable-next-line react/display-name
          icon: () => <EditIcon/>,
          tooltip: "Edit",
          onClick: async (event, rowData: Partial<Song>) => {
            if (rowData?.id !== undefined) {
              await router.push(`/dashboard/songs/${rowData.id}`);
            }
          },
        },
        (r) => ({
          // eslint-disable-next-line react/display-name
          icon: () => <OpenInNewIcon/>,
          tooltip: "View in VocaDB",
          onClick: async (event, rowData: Partial<Song>) => {
            if (rowData?.id !== undefined) {
              await window.open(`https://vocadb.net/S/${rowData.id}`, "_blank");
            }
          },
          disabled: r.id < 0,
        }),
        (r) => ({
          // eslint-disable-next-line react/display-name
          icon: () => <GetAppIcon/>,
          tooltip: "Overwrite from VocaDB",
          onClick: async (event, rowData: Partial<Song>) => {
            if (rowData?.id !== undefined) {
              const result = await apolloClient.mutate<{enrolSongFromVocaDB: Song}>({
                mutation: SONG_OVERWRITE_MUTATION,
                variables: {id: rowData.id}
              });
              if (result.data.enrolSongFromVocaDB) {
                const updated = result.data.enrolSongFromVocaDB;
                query.updateQuery(prev => ({
                  songs: prev.songs.map(v => v.id === updated.id ? updated : v),
                }));
              }
            }
          },
          disabled: r.id < 0,
        }),
      ]}
      options={{
        actionsColumnIndex: -1,
        pageSize: 20,
      }}
    />;
  }

  return (
    <div>
      {table}
      {children}
    </div>
  );
}

// eslint-disable-next-line react/display-name, @typescript-eslint/explicit-module-boundary-types
export const getLayout = (page: ReactNode) => getDashboardLayout("Song entities")(<SongInfoLayout>{page}</SongInfoLayout>);
