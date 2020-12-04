import { ReactNode, useCallback } from "react";
import { makeStyles, Typography } from "@material-ui/core";
import { useRouter } from "next/router";
import {getLayout as getDashboardLayout} from "./DashboardLayout";
import { gql, useQuery } from "@apollo/client";
import Alert from "@material-ui/lab/Alert";
import { MusicFilesPagination } from "../../../graphql/MusicFileResolver";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import TooltipIconButton from "../TooltipIconButton";

const useStyles = makeStyles((theme) => ({
  navBar: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: theme.spacing(1),
    "& > *": {
      margin: theme.spacing(0, 1),
    }
  }
}));

const PENDING_REVIEW_FILES_QUERY = gql`
  query {
    musicFiles(first: -1) {
      totalCount
      edges {
        node {
          id
          needReview
        }
      }
    }
  }
`;

interface Props {
  children: ReactNode;
}

export default function ReviewLayout({children}: Props) {
  const styles = useStyles();
  const router = useRouter();
  const fileId = parseInt(router.query.fileId as string);

  const needReviewQuery = useQuery<{ musicFiles: MusicFilesPagination }>(PENDING_REVIEW_FILES_QUERY);
  const edges = needReviewQuery.data?.musicFiles.edges;

  let content = <Alert severity="info">Loading...</Alert>;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goToFile = useCallback((index: number) => async () => {
    if (edges) {
      const fileId = edges[index].node.id;
      await router.push(`/dashboard/review/${fileId}`, undefined, {shallow: true});
    }
  }, [router, edges]);

  if (edges) {
    const index = edges.findIndex(v => v.node.id === fileId);
    if (index == -1) {
      content = <Alert severity="error">Music file with ID {`${router.query.fileId}`} is not found.</Alert>;
    } else {
      let prevUnreviewed = index - 1;
      while (prevUnreviewed > 0 && !edges[prevUnreviewed].node.needReview) prevUnreviewed--;

      let nextUnreviewed = index + 1;
      while (nextUnreviewed < edges.length && !edges[nextUnreviewed].node.needReview) nextUnreviewed++;

      const hasPrev = index > 0;
      const hasPrevUnreviewed = prevUnreviewed >= 0;
      const hasNext = index + 1 < edges.length;
      const hasNextUnreviewed = nextUnreviewed < edges.length;

      content = <>
        <div className={styles.navBar}>
          <TooltipIconButton
            title="Previous file"
            disabled={!hasPrev}
            aria-label="Go to previous file"
            onClick={goToFile(index - 1)}>
            <ChevronLeftIcon/>
          </TooltipIconButton>
          <TooltipIconButton
            title="Previous unreviewed file"
            disabled={!hasPrevUnreviewed}
            aria-label="Go to previous unreviewed file"
            color="secondary"
            onClick={goToFile(prevUnreviewed)}>
            <ChevronLeftIcon/>
          </TooltipIconButton>
          <Typography>#{fileId}: {index + 1} / {edges.length}</Typography>
          <TooltipIconButton
            title="Next unreviewed file"
            disabled={!hasNextUnreviewed}
            aria-label="Go to next unreviewed file"
            color="secondary"
            onClick={goToFile(nextUnreviewed)}>
            <ChevronRightIcon/>
          </TooltipIconButton>
          <TooltipIconButton
            title="Next file"
            disabled={!hasNext}
            aria-label="Go to next file"
            onClick={goToFile(index + 1)}>
            <ChevronRightIcon/>
          </TooltipIconButton>
        </div>
        {children}
      </>;
    }
  }

  return content;
}

// eslint-disable-next-line react/display-name
export const getLayout = (title?: string) => (page: ReactNode) => getDashboardLayout(title)(<ReviewLayout>{page}</ReviewLayout>);
