import React, { ReactNode } from "react";
import { getLayout as getDashboardLayout } from "./DashboardLayout";
import { gql, useQuery } from "@apollo/client";
import { Alert } from "@material-ui/lab";
import { TableIcons } from "../MaterialTableIcons";
import EditIcon from "@material-ui/icons/Edit";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import MaterialTable from "material-table";
import { useRouter } from "next/router";
import { formatArtistsPlainText } from "../../../frontendUtils/artists";
import { Avatar, ListItemText } from "@material-ui/core";
import { Album } from "../../../models/Album";

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
  const query = useQuery<{albums: Album[]}>(ALBUM_INFO_LIST_QUERY);

  let table: ReactNode = null;
  if (query.loading) table = <Alert severity="info">Loading...</Alert>;
  else if (query.error) table = <Alert severity="error">Error: {`${query.error}`}</Alert>;
  else if (query.data) {
    const rows = query.data.albums.map(v => ({...v}));

    table = <MaterialTable
      title={`${rows.length} album entities.`}
      columns={[
        {title: "ID", field: "id", width: "3em",},
        // eslint-disable-next-line react/display-name
        {title: "Cover", field: "coverUrl", width: "3em", render: r => <Avatar variant="rounded" src={r.coverUrl}>{r.name[0]}</Avatar>},
        // eslint-disable-next-line react/display-name
        {title: "Album name", field: "name", render: r => <ListItemText primary={r.name} secondary={r.sortOrder} />},
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
          onClick: async (event, rowData: Partial<Album>) => {
            if (rowData?.id !== undefined) {
              await router.push(`/dashboard/albums/${rowData.id}`);
            }
          },
        },
        (r) => ({
          // eslint-disable-next-line react/display-name
          icon: () => <OpenInNewIcon/>,
          tooltip: "View in VocaDB",
          onClick: async (event, rowData: Partial<Album>) => {
            if (rowData?.id !== undefined) {
              await window.open(`https://vocadb.net/Al/${rowData.id}`, "_blank");
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
export const getLayout = (page: ReactNode) => getDashboardLayout("Alubum entities")(<AlbumInfoLayout>{page}</AlbumInfoLayout>);
