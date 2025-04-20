"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { gql, useQuery } from "@apollo/client";
import type { DocumentNode } from "@apollo/client/core";
import type { MusicFilesPagination } from "@lyricova/api/graphql/types";
import { Alert, AlertTitle } from "@lyricova/components/components/ui/alert";
import { Button } from "@lyricova/components/components/ui/button";
import { Badge } from "@lyricova/components/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { NavHeader } from "../../NavHeader";

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
  const params = useParams();
  const fileId = parseInt(params.fileId as string);

  const needReviewQuery = useQuery<{ musicFiles: MusicFilesPagination }>(
    PENDING_REVIEW_FILES_QUERY
  );
  const edges = needReviewQuery.data?.musicFiles.edges;

  let content = (
    <Alert variant="info">
      <AlertTitle>Loading… </AlertTitle>
    </Alert>
  );

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
        <Alert variant="destructive">
          <AlertTitle>Music file with ID {fileId} is not found.</AlertTitle>
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
          <div className="flex flex-wrap justify-between mb-4">
            <div className="flex items-center gap-2 flex-grow w-0">
              <Badge
                variant={edges[index].node.needReview ? "outline" : "success"}
              >
                <div className="relative w-1 h-1">
                  <div
                    className={`absolute inset-0 rounded-full bg-current ${
                      edges[index].node.needReview
                        ? "opacity-75"
                        : "opacity-100 shadow-[0_0_1px_currentColor,0_0_4px_currentColor]"
                    }`}
                  />
                </div>
                <span className="ml-2">
                  {edges[index].node.needReview ? "Needs Review" : "Reviewed"}
                </span>
              </Badge>
              <div className="truncate">{edges[index].node.path}</div>
            </div>

            <div className="flex items-center flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!hasPrev}
                    onClick={goToFile(index - 1)}
                  >
                    <ChevronLeft />
                    <span className="sr-only">Previous file</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous file</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!hasPrevUnreviewed}
                    onClick={goToFile(prevUnreviewed)}
                  >
                    <ChevronsLeft />
                    <span className="sr-only">Previous unreviewed file</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous unreviewed file</TooltipContent>
              </Tooltip>

              <span className="text-sm mx-2">
                #{fileId}: {index + 1} / {edges.length}
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!hasNextUnreviewed}
                    onClick={goToFile(nextUnreviewed)}
                  >
                    <ChevronsRight />
                    <span className="sr-only">Next unreviewed file</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next unreviewed file</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!hasNext}
                    onClick={goToFile(index + 1)}
                  >
                    <ChevronRight />
                    <span className="sr-only">Next file</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next file</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {children}
        </>
      );
    }
  }

  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: "Review",
            href: "/dashboard/review",
          },
          {
            label: `Music file #${fileId}`,
          },
        ]}
      />
      <div className="mx-4 mb-4">{content}</div>
    </>
  );
}
