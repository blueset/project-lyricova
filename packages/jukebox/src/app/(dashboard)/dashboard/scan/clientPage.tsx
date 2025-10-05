"use client";

import { Progress } from "@lyricova/components/components/ui/progress";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import { gql, useApolloClient, useMutation } from "@apollo/client";
import { useCallback } from "react";
import type { MusicFilesScanOutcome } from "@lyricova/api/graphql/types";
import { useNamedState } from "@/hooks/useNamedState";
import { NavHeader } from "../NavHeader";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lyricova/components/components/ui/alert";
import { CircleCheck, CircleX } from "lucide-react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@lyricova/components/components/ui/item";

const SCAN_MUTATION = gql`
  mutation ($sessionId: String!) {
    scan(sessionId: $sessionId) {
      added
      deleted
      updated
      unchanged
    }
  }
`;

const SCAN_PROGRESS_SUBSCRIPTION = gql`
  subscription ($sessionId: String!) {
    scanProgress(sessionId: $sessionId) {
      total
      added
      deleted
      updated
      unchanged
    }
  }
`;

function LinearProgressWithLabel({ value }: { value: number }) {
  return (
    <div className="flex items-center">
      <div className="flex-grow mr-4">
        <Progress value={value} />
      </div>
      <div className="w-max text-sm shrink-0 text-muted-foreground">
        {`${Math.round(value)}%`}
      </div>
    </div>
  );
}

export default function Scan() {
  const [scan, scanResult] = useMutation<{ scan: MusicFilesScanOutcome }>(
    SCAN_MUTATION
  );
  const [progress, setProgress] = useNamedState(0, "progress");
  const [scanning, setScanning] = useNamedState(false, "scanning");
  const apolloClient = useApolloClient();

  const clickScan = useCallback(async () => {
    setScanning(true);
    const sessionId = `${Math.random()}`;
    const scanPromise = scan({ variables: { sessionId } });
    setProgress(0);

    const subscription = apolloClient.subscribe<{
      scanProgress: MusicFilesScanOutcome;
    }>({
      query: SCAN_PROGRESS_SUBSCRIPTION,
      variables: { sessionId },
    });
    const zenSubscription = subscription.subscribe({
      next(x) {
        if (x.data.scanProgress !== null) {
          const { total, added, deleted, updated, unchanged } =
            x.data.scanProgress;
          if (total > 0) {
            setProgress(
              ((added + deleted + updated + unchanged) / total) * 100
            );
          }
        }
      },
      error(err) {
        console.log(`Finished with error: ${err}`);
      },
      complete() {
        console.log("Finished");
      },
    });

    await scanPromise;
    zenSubscription.unsubscribe();

    setScanning(false);
  }, [apolloClient, scan, setProgress, setScanning]);

  let resultNode = <></>;
  if (scanResult.called) {
    if (scanResult.error) {
      resultNode = (
        <Alert variant="error">
          <CircleX />
          <AlertTitle>Error occurred while scanning</AlertTitle>
          <AlertDescription>{`${scanResult.error}`}</AlertDescription>
        </Alert>
      );
    } else if (scanResult.data) {
      const data = scanResult.data.scan;
      resultNode = (
        <Alert variant="success">
          <CircleCheck />
          <AlertTitle>Scan completed</AlertTitle>
          <AlertDescription className="flex flex-col gap-1">
            <div>{data.added} tracks added</div>
            <div>{data.deleted} tracks deleted</div>
            <div>{data.updated} tracks updated</div>
            <div>{data.unchanged} tracks unchanged</div>
          </AlertDescription>
        </Alert>
      );
    } else {
      resultNode = <LinearProgressWithLabel value={progress} />;
    }
  }

  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: "Scan",
          },
        ]}
      />
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>Perform scan</ItemTitle>
            <ItemDescription>
              Scan local music files and update the database
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <ProgressButton
              onClick={clickScan}
              progress={scanning}
              variant="outline"
            >
              Scan
            </ProgressButton>
          </ItemActions>
        </Item>
        {resultNode}
      </div>
    </>
  );
}
