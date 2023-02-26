import React, { ReactNode } from "react";
import { getLayout as getDashboardLayout } from "./DashboardLayout";
import { gql, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import EditIcon from "@mui/icons-material/Edit";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useRouter } from "next/router";
import { formatArtistsPlainText } from "lyricova-common/frontendUtils/artists";
import { Avatar, ListItemText, Tooltip } from "@mui/material";
import { Album } from "lyricova-common/models/Album";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import { DataGridToolbar } from "lyricova-common/components/DataGridToolbar";

const ALBUM_INFO_LIST_QUERY = gql`
  query {
    albums {
      id
      name
      sortOrder
      artists {
        id
        name
        ArtistOfAlbum {
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

export default function AlbumInfoLayout({ children }: Props) {
  const router = useRouter();
  const query = useQuery<{ albums: Album[] }>(ALBUM_INFO_LIST_QUERY);

  let table: ReactNode = null;
  if (query.loading) table = <Alert severity="info">Loading...</Alert>;
  else if (query.error)
    table = <Alert severity="error">Error: {`${query.error}`}</Alert>;
  else if (query.data) {
    const rows = query.data.albums.map((v) => ({ ...v }));

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
            headerName: "Album name",
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
                      await router.push(`/dashboard/albums/${rowData.id}`);
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
                      await window.open(
                        `https://vocadb.net/Al/${rowData.id}`,
                        "_blank"
                      );
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
            title: `${rows.length} album entities.`,
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
  getDashboardLayout("Album entities")(
    <AlbumInfoLayout>{page}</AlbumInfoLayout>
  );
