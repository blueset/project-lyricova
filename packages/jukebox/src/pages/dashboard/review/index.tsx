import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";
import { gql, useQuery } from "@apollo/client";
import { Box } from "@material-ui/core";
import { Alert, AlertTitle } from "@material-ui/lab";
import { MusicFilesPagination } from "../../../graphql/MusicFileResolver";
import React, { forwardRef, PropsWithoutRef, useCallback } from "react";
import { useNamedState } from "../../../frontendUtils/hooks";
import MaterialTable from "material-table";
import RateReviewIcon from "@material-ui/icons/RateReview";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";

// region material-table icons

import { SvgIcon } from "@material-ui/core";
import AddBox from "@material-ui/icons/AddBox";
import ArrowDownward from "@material-ui/icons/ArrowDownward";
import Check from "@material-ui/icons/Check";
import ChevronLeft from "@material-ui/icons/ChevronLeft";
import ChevronRight from "@material-ui/icons/ChevronRight";
import Clear from "@material-ui/icons/Clear";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import Edit from "@material-ui/icons/Edit";
import FilterList from "@material-ui/icons/FilterList";
import FirstPage from "@material-ui/icons/FirstPage";
import LastPage from "@material-ui/icons/LastPage";
import Remove from "@material-ui/icons/Remove";
import SaveAlt from "@material-ui/icons/SaveAlt";
import Search from "@material-ui/icons/Search";
import ViewColumn from "@material-ui/icons/ViewColumn";
import { useRouter } from "next/router";
import { MusicFile } from "../../../models/MusicFile";

function iconForwardRef(Node: typeof SvgIcon) {
  const result = forwardRef<SVGSVGElement,
    PropsWithoutRef<typeof SvgIcon>>((props, ref) => <Node {...props} ref={ref}/>);
  result.displayName = `forwardRef(${Node.name})`;
  return result;
}

const tableIcons = {
  Add: iconForwardRef(AddBox),
  Check: iconForwardRef(Check),
  Clear: iconForwardRef(Clear),
  Delete: iconForwardRef(DeleteOutline),
  DetailPanel: iconForwardRef(ChevronRight),
  Edit: iconForwardRef(Edit),
  Export: iconForwardRef(SaveAlt),
  Filter: iconForwardRef(FilterList),
  FirstPage: iconForwardRef(FirstPage),
  LastPage: iconForwardRef(LastPage),
  NextPage: iconForwardRef(ChevronRight),
  PreviousPage: iconForwardRef(ChevronLeft),
  ResetSearch: iconForwardRef(Clear),
  Search: iconForwardRef(Search),
  SortArrow: iconForwardRef(ArrowDownward),
  ThirdStateCheck: iconForwardRef(Remove),
  ViewColumn: iconForwardRef(ViewColumn),
};

// endregion material-table icons

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
      icons={tableIcons}
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
      }}
    />
  </Box>;
}

Review.layout = getLayout("Review");
