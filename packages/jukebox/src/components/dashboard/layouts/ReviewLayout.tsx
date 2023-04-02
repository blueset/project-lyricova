import { ReactNode, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import { useRouter } from "next/router";
import { getLayout as getDashboardLayout } from "./DashboardLayout";
import { gql, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import type { MusicFilesPagination } from "../../../graphql/MusicFileResolver";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TooltipIconButton from "../TooltipIconButton";
import { DocumentNode } from "@apollo/client/core";

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
` as DocumentNode;

interface Props {
  children: ReactNode;
}

export default function ReviewLayout({ children }: Props) {
  const router = useRouter();
  const fileId = parseInt(router.query.fileId as string);

  const needReviewQuery = useQuery<{ musicFiles: MusicFilesPagination }>(
    PENDING_REVIEW_FILES_QUERY
  );
  const edges = needReviewQuery.data?.musicFiles.edges;

  let content = <Alert severity="info">Loading...</Alert>;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goToFile = useCallback(
    (index: number) => async () => {
      if (edges) {
        const fileId = edges[index].node.id;
        await router.push(`/dashboard/review/${fileId}`, undefined, {
          shallow: true,
        });
      }
    },
    [router, edges]
  );

  if (edges) {
    const index = edges.findIndex((v) => v.node.id === fileId);
    if (index == -1) {
      content = (
        <Alert severity="error">
          Music file with ID {`${router.query.fileId}`} is not found.
        </Alert>
      );
    } else {
      let prevUnreviewed = index - 1;
      while (prevUnreviewed > 0 && !edges[prevUnreviewed].node.needReview)
        prevUnreviewed--;

      let nextUnreviewed = index + 1;
      while (
        nextUnreviewed < edges.length &&
        !edges[nextUnreviewed].node.needReview
      )
        nextUnreviewed++;

      const hasPrev = index > 0;
      const hasPrevUnreviewed = prevUnreviewed >= 0;
      const hasNext = index + 1 < edges.length;
      const hasNextUnreviewed = nextUnreviewed < edges.length;

      content = (
        <>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              margin: 1,
            }}
          >
            <TooltipIconButton
              title="Previous file"
              disabled={!hasPrev}
              aria-label="Go to previous file"
              onClick={goToFile(index - 1)}
              sx={{ mr: 1 }}
            >
              <ChevronLeftIcon />
            </TooltipIconButton>
            <TooltipIconButton
              title="Previous unreviewed file"
              disabled={!hasPrevUnreviewed}
              aria-label="Go to previous unreviewed file"
              color="secondary"
              onClick={goToFile(prevUnreviewed)}
              sx={{ mr: 1 }}
            >
              <ChevronLeftIcon />
            </TooltipIconButton>
            <Typography sx={{ mr: 1 }}>
              #{fileId}: {index + 1} / {edges.length}
            </Typography>
            <TooltipIconButton
              title="Next unreviewed file"
              disabled={!hasNextUnreviewed}
              aria-label="Go to next unreviewed file"
              color="secondary"
              onClick={goToFile(nextUnreviewed)}
              sx={{ mr: 1 }}
            >
              <ChevronRightIcon />
            </TooltipIconButton>
            <TooltipIconButton
              title="Next file"
              disabled={!hasNext}
              aria-label="Go to next file"
              onClick={goToFile(index + 1)}
              sx={{ mr: 1 }}
            >
              <ChevronRightIcon />
            </TooltipIconButton>
          </Box>
          {children}
        </>
      );
    }
  }

  return content;
}

// eslint-disable-next-line react/display-name
export const getLayout = (title?: string) => (page: ReactNode) =>
  getDashboardLayout(title)(<ReviewLayout>{page}</ReviewLayout>);
