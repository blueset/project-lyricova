import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";
import { gql, useQuery, useApolloClient } from "@apollo/client";
import { Box, Button, Popover, Tooltip, Typography } from "@mui/material";
import { Alert, AlertTitle } from "@mui/material";
import React from "react";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import { DataGridToolbar } from "lyricova-common/components/DataGridToolbar";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useSnackbar } from "notistack";
import PopupState, { bindTrigger, bindPopover } from "material-ui-popup-state";
import { Stack } from "@mui/system";
import type { Tag } from "lyricova-common/models/Tag";
import { TagFormPopup } from "../../../components/dashboard/TagForm";

dayjs.extend(relativeTime);

const TAGS_QUERY = gql`
  query Tags {
    tags {
      color
      name
      slug
      entries {
        id
      }
    }
  }
`;

const DELETE_TAG_MUTATION = gql`
  mutation DeleteTag($slug: String!) {
    deleteTag(slug: $slug)
  }
`;

export default function Tags() {
  const tagsQuery = useQuery<{ tags: Tag[] }>(TAGS_QUERY);
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();
  const rows = tagsQuery.data?.tags ?? [];

  return (
    <Box sx={{ minHeight: "calc(100vh - 7em)", height: 0 }}>
      {tagsQuery.error && (
        <Alert severity="error">
          <AlertTitle>Error occurred while retrieving data.</AlertTitle>
          {`${tagsQuery.error}`}
        </Alert>
      )}
      <DataGrid
        columns={[
          { headerName: "Slug", field: "slug", flex: 1 },
          {
            headerName: "Name",
            field: "name",
            flex: 1,

            renderCell: (p) => (
              <span style={{ color: p.row.color }}>{p.row.name}</span>
            ),
          },
          {
            headerName: "Color",
            field: "color",
            flex: 1,
            renderCell: (p) => (
              <>
                <div
                  style={{
                    display: "inline-block",
                    width: "1em",
                    height: "1em",
                    backgroundColor: p.row.color,
                    marginRight: "0.5em",
                  }}
                />{" "}
                {p.row.color}
              </>
            ),
          },
          {
            headerName: "Entries",
            field: "entries",
            flex: 1,
            renderCell: (p) => <>{p.row.entries.length} entries</>,
          },
          {
            field: "actions",
            type: "actions",
            width: 100,
            getActions: (rowData) => [
              <TagFormPopup
                key="review"
                onSubmit={() => tagsQuery.refetch()}
                slug={rowData?.row.slug}
              >
                <Tooltip title="Edit">
                  <GridActionsCellItem icon={<EditIcon />} label="Edit" />
                </Tooltip>
              </TagFormPopup>,
              <PopupState
                key="delete"
                variant="popover"
                popupId={`${rowData?.id}-delete-popup`}
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
                        <Typography>Delete tag {rowData?.row.name}?</Typography>
                        <Button
                          color="error"
                          onClick={async () => {
                            if (rowData?.row.slug) {
                              await apolloClient.mutate({
                                mutation: DELETE_TAG_MUTATION,
                                variables: {
                                  slug: rowData.row.slug,
                                },
                              });
                              snackbar.enqueueSnackbar("Tag deleted.", {
                                variant: "success",
                              });
                              await tagsQuery.refetch();
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
        getRowId={(r) => r.slug}
        components={{ Toolbar: DataGridToolbar }}
        componentsProps={{
          toolbar: {
            title: `${rows.length} tags.`,
            children: (
              <>
                <TagFormPopup onSubmit={() => tagsQuery.refetch()}>
                  <Button startIcon={<AddIcon />}>New tag</Button>
                </TagFormPopup>
              </>
            ),
          },
        }}
      />
    </Box>
  );
}

Tags.layout = getLayout("Tags");
