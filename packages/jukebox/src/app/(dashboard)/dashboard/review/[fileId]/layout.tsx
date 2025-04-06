"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { gql, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import type { MusicFilesPagination } from "@lyricova/api/graphql/types";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TooltipIconButton from "@/components/dashboard/TooltipIconButton";
import type { DocumentNode } from "@apollo/client/core";

const PENDING_REVIEW_FILES_QUERY = gql`
  query {
    musicFiles(first: -1) {
      totalCount
      edges {
        node {
          id
          path
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
  const searchParams = useSearchParams();
  const fileId = parseInt(searchParams.get("fileId") as string);

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
        await router.push(`/dashboard/review/${fileId}`);
      }
    },
    [router, edges]
  );

  if (edges) {
    const index = edges.findIndex((v) => v.node.id === fileId);
    if (index == -1) {
      content = (
        <Alert severity="error">
          Music file with ID {fileId} is not found.
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
          <Stack
            direction="row"
            flexWrap="wrap"
            sx={{ justifyContent: "space-between", margin: 1 }}
          >
            <Stack
              direction="row"
              gap={1}
              sx={{ alignItems: "center", flexGrow: 1, width: 0 }}
            >
              <Chip
                label={
                  edges[index].node.needReview ? "Needs Review" : "Reviewed"
                }
                variant="outlined"
                size="small"
                color={edges[index].node.needReview ? "default" : "secondary"}
                icon={
                  <Box
                    component="svg"
                    sx={{
                      width: "1em",
                      height: "1em",
                      display: "inline-block",
                    }}
                  >
                    <circle
                      cx="0.5em"
                      cy="0.5em"
                      r="0.125em"
                      fill="currentColor"
                      opacity={edges[index].node.needReview ? 0.75 : 1}
                      style={
                        !edges[index].node.needReview
                          ? {
                              filter:
                                "drop-shadow(currentcolor 0px 0px 1px) drop-shadow(currentColor 0 0 4px)",
                            }
                          : {}
                      }
                    />
                  </Box>
                }
              />
              <Typography noWrap>{edges[index].node.path}</Typography>
            </Stack>
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                flexShrink: 0,
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
            </Stack>
          </Stack>
          {children}
        </>
      );
    }
  }

  return content;
}
