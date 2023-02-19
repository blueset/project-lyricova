import React, { ReactNode } from "react";
import { getLayout as getDashboardLayout } from "./DashboardLayout";
import { gql, useApolloClient, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import EditIcon from "@mui/icons-material/Edit";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import GetAppIcon from "@mui/icons-material/GetApp";
import { useRouter } from "next/router";
import { Avatar, Tooltip } from "@mui/material";
import { Artist } from "lyricova-common/models/Artist";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import { DataGridToolbar } from "../../../components/dashboard/DataGridToolbar";

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
  const query = useQuery<{ artists: Artist[] }>(ARTIST_INFO_LIST_QUERY);

  let table: ReactNode = null;
  if (query.loading) table = <Alert severity="info">Loading...</Alert>;
  else if (query.error)
    table = <Alert severity="error">Error: {`${query.error}`}</Alert>;
  else if (query.data) {
    const rows = query.data.artists.map((v) => ({ ...v }));
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
              <Avatar variant="rounded" src={r.mainPictureUrl}>
                {r.name[0]}
              </Avatar>
            ),
          },
          // eslint-disable-next-line react/display-name
          { headerName: "Artist name", field: "name", flex: 1 },
          { headerName: "Sort order", field: "sortOrder", flex: 1 },
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
                      await router.push(`/dashboard/artist/${rowData.id}`);
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
                        `https://vocadb.net/Ar/${rowData.id}`,
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
                        enrolArtistFromVocaDB: Artist;
                      }>({
                        mutation: ARTIST_OVERWRITE_MUTATION,
                        variables: { id: rowData.id },
                      });
                      if (result.data.enrolArtistFromVocaDB) {
                        const updated = result.data.enrolArtistFromVocaDB;
                        query.updateQuery((prev) => ({
                          artists: prev.artists.map((v) =>
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
            title: `${rows.length} artist entities.`,
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
  getDashboardLayout("Artist entities")(
    <ArtistInfoLayout>{page}</ArtistInfoLayout>
  );
