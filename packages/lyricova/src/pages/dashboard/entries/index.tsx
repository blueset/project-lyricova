import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";
import { gql, useQuery, useApolloClient } from "@apollo/client";
import { Box, Button, Chip, Popover, Tooltip, Typography } from "@mui/material";
import { Alert, AlertTitle } from "@mui/material";
import React from "react";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useRouter } from "next/router";
import {
  DataGrid,
  getGridStringOperators,
  GridActionsCellItem,
  GridCellParams,
} from "@mui/x-data-grid";
import { NextComposedLink } from "lyricova-common/components/Link";
import { Entry } from "lyricova-common/models/Entry";
import { DataGridToolbar } from "lyricova-common/components/DataGridToolbar";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useSnackbar } from "notistack";
import PopupState, { bindTrigger, bindPopover } from "material-ui-popup-state";
import { Stack } from "@mui/system";
import { Tag } from "lyricova-common/models/Tag";
import _ from "lodash";
import { Song } from "lyricova-common/models/Song";

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

const DELETE_ENTRY_MUTATION = gql`
  mutation DeleteEntry($id: Int!) {
    deleteEntry(id: $id)
  }
`;

const BUMP_ENTRY_MUTATION = gql`
  mutation BumpEntry($id: Int!) {
    bumpEntry(id: $id)
  }
`;

export default function Entries() {
  const entriesQuery = useQuery<{ entries: Entry[] }>(ENTRIES_QUERY);
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();
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
            getApplyQuickFilterFn(value, colDef, apiRef) {
              const pattern = new RegExp(_.escapeRegExp(value), "i");
              return (params: GridCellParams): boolean => {
                return params.value
                  .map((t: Tag) => t.name)
                  .join(",")
                  .match(pattern);
              };
            },
            renderCell: (p) => (
              <>
                {p.row.tags.map((t: Tag) => (
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
            getApplyQuickFilterFn(value, colDef, apiRef) {
              const pattern = new RegExp(_.escapeRegExp(value), "i");
              return (params: GridCellParams): boolean => {
                return params.value
                  .map((t: Song) => t.name)
                  .join(",")
                  .match(pattern);
              };
            },
            renderCell: (p) =>
              p.row.songs.map((t: Song) => t.name).join(", ") || <em>None</em>,
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
            width: 120,
            getActions: (rowData) => [
              <Tooltip title="Edit" key="review">
                <GridActionsCellItem
                  icon={<EditIcon />}
                  label="Edit"
                  LinkComponent={NextComposedLink}
                  {...({
                    href: `/dashboard/entries/${rowData?.row.id}`,
                  } as any)}
                />
              </Tooltip>,
              <Tooltip title="Bump" key="bump">
                <GridActionsCellItem
                  icon={<UploadFileIcon />}
                  label="Bump"
                  onClick={async () => {
                    if (rowData?.row.id) {
                      await apolloClient.mutate({
                        mutation: BUMP_ENTRY_MUTATION,
                        variables: {
                          id: rowData.row.id,
                        },
                      });
                      snackbar.enqueueSnackbar("Entry bumped.", {
                        variant: "success",
                      });
                      await entriesQuery.refetch();
                    }
                  }}
                />
              </Tooltip>,
              <PopupState
                variant="popover"
                popupId={`${rowData?.row.id}-delete-popup`}
              >
                {(popupState) => (
                  <>
                    <Tooltip title="Delete" key="delete">
                      <GridActionsCellItem
                        icon={<DeleteIcon />}
                        label="Delete"
                        color="error"
                        {...bindTrigger(popupState)}
                      />
                    </Tooltip>
                    <Popover
                      {...bindPopover(popupState)}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                      transformOrigin={{
                        vertical: "top",
                        horizontal: "right",
                      }}
                    >
                      <Stack p={2} gap={1} alignItems="end">
                        <Typography>
                          Delete entry #{rowData?.id} {rowData?.row.title}?
                        </Typography>
                        <Button
                          color="error"
                          onClick={async () => {
                            if (rowData?.row.id) {
                              await apolloClient.mutate({
                                mutation: DELETE_ENTRY_MUTATION,
                                variables: {
                                  id: rowData.row.id,
                                },
                              });
                              snackbar.enqueueSnackbar("Entry deleted.", {
                                variant: "success",
                              });
                              await entriesQuery.refetch();
                              popupState.close();
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Popover>
                  </>
                )}
              </PopupState>,
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
