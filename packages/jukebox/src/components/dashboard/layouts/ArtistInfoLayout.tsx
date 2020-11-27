import React, { ReactNode } from "react";
import { getLayout as getDashboardLayout } from "./DashboardLayout";
import { gql, useApolloClient, useQuery } from "@apollo/client";
import { Alert } from "@material-ui/lab";
import { TableIcons } from "../MaterialTableIcons";
import EditIcon from "@material-ui/icons/Edit";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import GetAppIcon from "@material-ui/icons/GetApp";
import MaterialTable from "material-table";
import { useRouter } from "next/router";
import { formatArtistsPlainText } from "../../../frontendUtils/artists";
import { Avatar, ListItemText } from "@material-ui/core";
import { Album } from "../../../models/Album";
import { Artist } from "../../../models/Artist";

const ARTIST_INFO_LIST_QUERY = gql`
  query {
    artists {
      id
      name
      sortOrder
      incomplete
      mainPictureUrl
    }
  }
`;

const ARTIST_OVERWRITE_MUTATION = gql`
  mutation($id: Int!) {
    enrolArtistFromVocaDB(artistId: $id) {
      id
      name
      sortOrder
      incomplete
      mainPictureUrl
    }
  }
`;

interface Props {
  children: ReactNode;
}

export default function ArtistInfoLayout({ children }: Props) {
  const router = useRouter();
  const apolloClient = useApolloClient();
  const query = useQuery<{artists: Artist[]}>(ARTIST_INFO_LIST_QUERY);

  let table: ReactNode = null;
  if (query.loading) table = <Alert severity="info">Loading...</Alert>;
  else if (query.error) table = <Alert severity="error">Error: {`${query.error}`}</Alert>;
  else if (query.data) {
    const rows = query.data.artists.map(v => ({...v}));

    table = <MaterialTable
      title={`${rows.length} artist entities.`}
      columns={[
        {title: "ID", field: "id", width: "3em",},
        // eslint-disable-next-line react/display-name
        {title: "Photo", field: "coverUrl", width: "3em", render: r => <Avatar variant="rounded" src={r.mainPictureUrl}>{r.name[0]}</Avatar>},
        // eslint-disable-next-line react/display-name
        {title: "Artist name", field: "name"},
        {title: "Sort order", field: "sortOrder"},
        {title: "Incomplete", field: "incomplete", type: "boolean", width: "2em",},
      ]}
      data={rows}
      icons={TableIcons}
      actions={[
        {
          // eslint-disable-next-line react/display-name
          icon: () => <EditIcon/>,
          tooltip: "Edit",
          onClick: async (event, rowData: Partial<Artist>) => {
            if (rowData?.id !== undefined) {
              await router.push(`/dashboard/artists/${rowData.id}`);
            }
          },
        },
        (r) => ({
          // eslint-disable-next-line react/display-name
          icon: () => <OpenInNewIcon/>,
          tooltip: "View in VocaDB",
          onClick: async (event, rowData: Partial<Artist>) => {
            if (rowData?.id !== undefined) {
              await window.open(`https://vocadb.net/Ar/${rowData.id}`, "_blank");
            }
          },
          disabled: r.id < 0,
        }),
        (r) => ({
          // eslint-disable-next-line react/display-name
          icon: () => <GetAppIcon/>,
          tooltip: "Overwrite from VocaDB",
          onClick: async (event, rowData: Partial<Artist>) => {
            if (rowData?.id !== undefined) {
              const result = await apolloClient.mutate<{enrolArtistFromVocaDB: Artist}>({
                mutation: ARTIST_OVERWRITE_MUTATION,
                variables: {id: rowData.id}
              });
              if (result.data.enrolArtistFromVocaDB) {
                const updated = result.data.enrolArtistFromVocaDB;
                query.updateQuery(prev => ({
                  artists: prev.artists.map(v => v.id === updated.id ? updated : v),
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
export const getLayout = (page: ReactNode) => getDashboardLayout("Artist entities")(<ArtistInfoLayout>{page}</ArtistInfoLayout>);
