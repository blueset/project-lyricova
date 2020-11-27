import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";
import { gql, useQuery } from "@apollo/client";
import { Box } from "@material-ui/core";
import { Alert, AlertTitle } from "@material-ui/lab";
import { MusicFilesPagination } from "../../../graphql/MusicFileResolver";
import React, { useCallback } from "react";
import { useNamedState } from "../../../frontendUtils/hooks";
import MaterialTable from "material-table";
import RateReviewIcon from "@material-ui/icons/RateReview";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";
import { useRouter } from "next/router";
import { MusicFile } from "../../../models/MusicFile";
import { TableIcons } from "../../../components/dashboard/MaterialTableIcons";

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
          needReview
        }
      }
    }
  }
`;

export default function Review() {
  const needReviewQuery = useQuery<{ musicFiles: MusicFilesPagination }>(PENDING_REVIEW_FILES_QUERY);

  const totalCount = needReviewQuery.data?.musicFiles.totalCount;
  const needReviewCount = needReviewQuery.data?.musicFiles.edges.filter(v => v.node.needReview).length;
  const edges = needReviewQuery.data?.musicFiles.edges;

  const router = useRouter();

  const [showAll, setShowAll] = useNamedState(false, "showAll");

  const toggleShowAll = useCallback(() => {
    setShowAll(!showAll);
  }, [showAll, setShowAll]);

  const rows = edges?.filter(v => showAll || v.node.needReview).map(v => ({...v.node})) ?? [];

  return <Box p={2}>
    {needReviewQuery.error && <Alert severity="error">
        <AlertTitle>Error occurred while retrieving data.</AlertTitle>
      {`${needReviewQuery.error}`}
    </Alert>}
    <MaterialTable
      title={`${needReviewCount ?? "..."} / ${totalCount ?? "..."} files pending review.`}
      columns={[
        {title: "ID", field: "id", width: "3em",},
        {title: "Track name", field: "trackName",},
        {title: "Artist name", field: "artistName",},
        {title: "Album name", field: "albumName",},
        {title: "Need review", field: "needReview", type: "boolean", width: "2em",},
      ]}
      data={rows}
      icons={TableIcons}
      actions={[
        {
          // eslint-disable-next-line react/display-name
          icon: () => <RateReviewIcon/>,
          tooltip: "Review",
          onClick: async (event, rowData: Partial<MusicFile>) => {
            if (rowData?.id !== undefined) {
              await router.push(`/dashboard/review/${rowData.id}`);
            }
          },
        },
        {
          // eslint-disable-next-line react/display-name
          icon: () => showAll ? <VisibilityOffIcon/> : <VisibilityIcon/>,
          tooltip: showAll ? "Hide reviewed" : "Show all",
          isFreeAction: true,
          onClick: toggleShowAll
        }
      ]}
      options={{
        actionsColumnIndex: -1,
        pageSize: 20,
      }}
    />
  </Box>;
}

Review.layout = getLayout("Review");
