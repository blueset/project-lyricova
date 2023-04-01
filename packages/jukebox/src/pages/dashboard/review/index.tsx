import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";
import { gql, useQuery } from "@apollo/client";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Alert, AlertTitle } from "@mui/material";
import { MusicFilesPagination } from "../../../graphql/MusicFileResolver";
import React, { useCallback } from "react";
import { useNamedState } from "../../../frontendUtils/hooks";
import RateReviewIcon from "@mui/icons-material/RateReview";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useRouter } from "next/router";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import { DataGridToolbar } from "lyricova-common/components/DataGridToolbar";
import { NextComposedLink } from "lyricova-common/components/Link";

const PENDING_REVIEW_FILES_QUERY = gql`
  query {
    musicFiles(first: -1) {
      totalCount
      edges {
        node {
          id
          trackName
          artistName
          albumName
          trackSortOrder
          artistSortOrder
          albumSortOrder
          needReview
        }
      }
    }
  }
`;

export default function Review() {
  const needReviewQuery = useQuery<{ musicFiles: MusicFilesPagination }>(
    PENDING_REVIEW_FILES_QUERY
  );

  const totalCount = needReviewQuery.data?.musicFiles.totalCount;
  const needReviewCount = needReviewQuery.data?.musicFiles.edges.filter(
    (v) => v.node.needReview
  ).length;
  const edges = needReviewQuery.data?.musicFiles.edges;

  const router = useRouter();
  const [showAll, setShowAll] = useNamedState(false, "showAll");

  const toggleShowAll = useCallback(() => {
    setShowAll(!showAll);
  }, [showAll, setShowAll]);

  const rows =
    edges
      ?.filter((v) => showAll || v.node.needReview)
      .map((v) => ({ ...v.node })) ?? [];

  return (
    <Box sx={{ minHeight: "calc(100vh - 7em)", height: 0 }}>
      {needReviewQuery.error && (
        <Alert severity="error">
          <AlertTitle>Error occurred while retrieving data.</AlertTitle>
          {`${needReviewQuery.error}`}
        </Alert>
      )}
      <DataGrid
        columns={[
          { headerName: "ID", field: "id", width: 75 },
          { headerName: "Track name", field: "trackName", flex: 2 },
          { headerName: "Track sort order", field: "trackSortOrder", flex: 1 },
          { headerName: "Artist name", field: "artistName", flex: 1 },
          {
            headerName: "Artist sort order",
            field: "artistSortOrder",
            flex: 1,
          },
          { headerName: "Album name", field: "albumName", flex: 1 },
          { headerName: "Album sort order", field: "albumSortOrder", flex: 1 },
          {
            headerName: "Need review",
            field: "needReview",
            type: "boolean",
            width: 100,
          },
          {
            field: "actions",
            type: "actions",
            width: 100,
            getActions: (rowData) => [
              <Tooltip title="Review" key="review">
                <GridActionsCellItem
                  icon={<RateReviewIcon />}
                  label="Review"
                  LinkComponent={NextComposedLink}
                  {...({ href: `/dashboard/review/${rowData?.id}` } as object)}
                />
              </Tooltip>,
            ],
          },
        ]}
        rows={rows}
        initialState={{
          columns: {
            columnVisibilityModel: {
              trackSortOrder: false,
              artistSortOrder: false,
              albumSortOrder: false,
            },
          },
        }}
        components={{ Toolbar: DataGridToolbar }}
        componentsProps={{
          toolbar: {
            title: `${needReviewCount ?? "..."} / ${totalCount ??
              "..."} files pending review.`,
            children: (
              <>
                <Tooltip title={showAll ? "Hide reviewed" : "Show all"}>
                  <IconButton onClick={toggleShowAll}>
                    {showAll ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </Tooltip>
              </>
            ),
          },
        }}
      />
    </Box>
  );
}

Review.layout = getLayout("Review");
