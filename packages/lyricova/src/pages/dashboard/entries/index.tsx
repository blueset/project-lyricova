import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";
import { gql, useQuery, useApolloClient } from "@apollo/client";
import { Box, Button, Chip, Popover, Tooltip, Typography } from "@mui/material";
import { Alert, AlertTitle } from "@mui/material";
import React from "react";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import type { GridCellParams } from "@mui/x-data-grid";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import type { Entry } from "lyricova-common/models/Entry";
import { DataGridToolbar } from "lyricova-common/components/DataGridToolbar";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useSnackbar } from "notistack";
import PopupState, { bindTrigger, bindPopover } from "material-ui-popup-state";
import { Stack } from "@mui/system";
import type { Tag } from "lyricova-common/models/Tag";
import _ from "lodash";
import type { Song } from "lyricova-common/models/Song";
import type { Verse } from "lyricova-common/models/Verse";
import { NextComposedLink } from "lyricova-common/components/Link";

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
      verses {
        text
        isMain
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
  const rows =
    entriesQuery.data?.entries.map((e) => ({
      ...e,
      actionDate: new Date(
        Math.max(
          e.creationDate.valueOf(),
          ...e.pulses.map((p) => p.creationDate.valueOf())
        )
      ),
    })) ?? [];

  return (
    <Box sx={{ minHeight: "calc(100vh - 7em)", height: 0 }}>
      {entriesQuery.error && (
        <Alert severity="error">
          <AlertTitle>Error occurred while retrieving data.</AlertTitle>
          {`${entriesQuery.error}`}
        </Alert>
      )}
      <DataGrid
        initialState={{
          columns: {
            columnVisibilityModel: {
              // Hide columns status and traderName, the other columns will remain visible
              producers: false,
              vocalists: false,
            },
          },
        }}
        columns={[
          { headerName: "ID", field: "id", width: 75 },
          { headerName: "Title", field: "title", flex: 2 },
          {
            headerName: "Artists",
            field: "artists",
            flex: 1,
            getApplyQuickFilterFn(value) {
              const pattern = new RegExp(_.escapeRegExp(value), "i");
              return (params: GridCellParams): boolean => {
                return !!`${params.row.producersName} feat. ${params.row.vocalistsName}`.match(
                  pattern
                );
              };
            },
            renderCell: (p) =>
              `${p.row.producersName} feat. ${p.row.vocalistsName}`,
          },
          {
            headerName: "Text",
            field: "verses",
            flex: 2,
            getApplyQuickFilterFn(value) {
              const pattern = new RegExp(_.escapeRegExp(value), "i");
              return (params: GridCellParams): boolean => {
                return !!params.row.verses
                  .filter((v: Verse) => v.isMain)[0]
                  .text.match(pattern);
              };
            },
            sortComparator(v1: Verse[], v2: Verse[]) {
              return v1
                .filter((v: Verse) => v.isMain)[0]
                .text.localeCompare(v2.filter((v: Verse) => v.isMain)[0].text);
            },
            renderCell: (p) =>
              p.row.verses.filter((v: Verse) => v.isMain)[0].text,
          },
          {
            headerName: "Producers",
            field: "producersName",
            flex: 1,
          },
          {
            headerName: "Vocalists",
            field: "vocalistsName",
            flex: 1,
          },
          {
            headerName: "Tags",
            field: "tags",
            flex: 1,
            getApplyQuickFilterFn(value) {
              const pattern = new RegExp(_.escapeRegExp(value), "i");
              return (params: GridCellParams<any, Tag[]>): boolean => {
                return !!params.value
                  .map((t: Tag) => t.name)
                  .join(",")
                  .match(pattern);
              };
            },
            sortComparator(v1: Tag[], v2: Tag[]) {
              return v1
                .map((t) => t.name)
                .join(",")
                .localeCompare(v2.map((t) => t.name).join(","));
            },
            renderCell: (p) => (
              <>
                {p.row.tags.map((t: Tag) => (
                  <Chip
                    key={t.slug}
                    label={t.name}
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: t.color,
                      color: t.color,
                      mr: 1,
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
            getApplyQuickFilterFn(value) {
              const pattern = new RegExp(_.escapeRegExp(value), "i");
              return (params: GridCellParams<any, Song[]>): boolean => {
                return !!params.value
                  .map((t: Song) => t.name)
                  .join(",")
                  .match(pattern);
              };
            },
            sortComparator(v1: Song[], v2: Song[]) {
              return v1
                .map((t) => t.name)
                .join(",")
                .localeCompare(v2.map((t) => t.name).join(","));
            },
            renderCell: (p) =>
              p.row.songs.map((t: Song) => t.name).join(", ") || <em>None</em>,
          },
          {
            headerName: "Recent action",
            field: "actionDate",
            type: "date",
            flex: 1,
            renderCell: (p) =>
              `${dayjs(p.row.actionDate.valueOf()).fromNow()} (${
                p.row.pulses.length
              } pulses)`,
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
                key="deletePopup"
                variant="popover"
                popupId={`${rowData?.row.id}-delete-popup`}
              >
                {(popupState) => (
                  <>
                    <Tooltip title="Delete">
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
        slots={{ toolbar: DataGridToolbar }}
        slotProps={{
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
