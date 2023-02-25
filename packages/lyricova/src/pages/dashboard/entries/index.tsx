import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";
import { gql, useQuery } from "@apollo/client";
import { Box, Button, Chip, Tooltip } from "@mui/material";
import { Alert, AlertTitle } from "@mui/material";
import React from "react";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useRouter } from "next/router";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import { NextComposedLink } from "lyricova-common/components/Link";
import { Entry } from "lyricova-common/models/Entry";
import { DataGridToolbar } from "lyricova-common/components/DataGridToolbar";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const ENTRIES_QUERY = gql`
  query {
    entries {
      id
      title
      producersName
      vocalistsName
      creationDate
      pulses {
        creationDate
      }
      tags {
        name
        slug
        color
      }
      songs {
        name
      }
    }
  }
`;

export default function Entries() {
  const entriesQuery = useQuery<{ entries: Entry[] }>(ENTRIES_QUERY);

  const router = useRouter();
  const rows = entriesQuery.data?.entries ?? [];

  return (
    <Box sx={{ minHeight: "calc(100vh - 7em)", height: 0 }}>
      {entriesQuery.error && (
        <Alert severity="error">
          <AlertTitle>Error occurred while retrieving data.</AlertTitle>
          {`${entriesQuery.error}`}
        </Alert>
      )}
      <DataGrid
        columns={[
          { headerName: "ID", field: "id", width: 75 },
          { headerName: "Title", field: "title", flex: 2 },
          { headerName: "Producers", field: "producersName", flex: 1 },
          { headerName: "Vocalists", field: "vocalistsName", flex: 1 },
          {
            headerName: "Tags",
            field: "tags",
            flex: 1,
            renderCell: (p) => (
              <>
                {p.row.tags.map((t) => (
                  <Chip
                    key={t.slug}
                    label={t.name}
                    variant="outlined"
                    sx={{
                      borderColor: t.color,
                      color: t.color,
                    }}
                  />
                ))}
              </>
            ),
          },
          {
            headerName: "Songs",
            field: "songs",
            flex: 1,
            renderCell: (p) =>
              p.row.songs.map((t) => t.name).join(", ") || <em>None</em>,
          },
          {
            headerName: "Recent action",
            field: "creationDate",
            flex: 1,
            renderCell: (p) =>
              `${dayjs(
                Math.max(
                  p.row.creationDate.valueOf(),
                  ...p.row.pulses.map((p) => p.creationDate.valueOf())
                )
              ).fromNow()} (${p.row.pulses.length} pulses)`,
          },
          {
            field: "actions",
            type: "actions",
            width: 100,
            getActions: (rowData) => [
              <Tooltip title="Edit" key="review">
                <GridActionsCellItem
                  icon={<EditIcon />}
                  label="Edit"
                  LinkComponent={NextComposedLink}
                  {...({ href: `/dashboard/entries/${rowData?.id}` } as any)}
                />
              </Tooltip>,
              <Tooltip title="Bump" key="review">
                <GridActionsCellItem icon={<UploadFileIcon />} label="Bump" />
              </Tooltip>,
            ],
          },
        ]}
        rows={rows}
        components={{ Toolbar: DataGridToolbar }}
        componentsProps={{
          toolbar: {
            title: `${rows.length} entries.`,
            children: (
              <>
                <Button
                  startIcon={<AddIcon />}
                  LinkComponent={NextComposedLink}
                  href="/dashboard/entries/new"
                >
                  New entry
                </Button>
              </>
            ),
          },
        }}
      />
    </Box>
  );
}

Entries.layout = getLayout("Entries");
