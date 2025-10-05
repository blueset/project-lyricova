"use client";

import { gql, useQuery } from "@apollo/client";
import type { DashboardStats } from "@lyricova/api/graphql/types";
import { useNamedState } from "@/hooks/useNamedState";
import { useEffect } from "react";
import Link from "next/link";
import { ClipboardEdit, Download, RefreshCw } from "lucide-react";
import type { DocumentNode } from "graphql";
import { CountCard, CountUpCard, PercentageCard } from "@lyricova/components";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@lyricova/components/components/ui/item";
import { NavHeader } from "./NavHeader";

const DASHBOARD_STATS_QUERY = gql`
  query {
    dashboardStats {
      aliveStartedOn
      revampStartedOn
      musicFilesCount
      reviewedFilesCount
      filesHasLyricsCount
      filesHasCoverCount
      songCount
      artistCount
      albumCount
    }
  }
` as DocumentNode;

type ConvertedDashboardStats = Record<keyof DashboardStats, number>;

export default function DashboardIndex() {
  const [now, setNow] = useNamedState(new Date(), "now");
  const { error, data } = useQuery<{ dashboardStats: ConvertedDashboardStats }>(
    DASHBOARD_STATS_QUERY
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [setNow]);

  return (
    <>
      <NavHeader breadcrumbs={[{ label: "Dashboard" }]} />
      <div className="p-4">
        {error && `Error occurred while loading stats: ${error}`}
        <div className="grid grid-cols-1 @3xl/dashboard:grid-cols-12 gap-4 mb-4">
          <div className="@3xl/dashboard:col-span-6">
            <CountUpCard
              title="Revamp dev time"
              now={now}
              time={data?.dashboardStats.revampStartedOn}
            />
          </div>
          <div className="@3xl/dashboard:col-span-6">
            <CountUpCard
              title="Project uptime"
              now={now}
              time={data?.dashboardStats.aliveStartedOn}
            />
          </div>
          <div className="col-span-1 @3xl/dashboard:col-span-3">
            <CountCard
              title="# of Music files"
              value={data?.dashboardStats.musicFilesCount}
            />
          </div>
          <div className="col-span-1 @3xl/dashboard:col-span-3">
            <CountCard
              title="# of Music entities"
              value={data?.dashboardStats.songCount}
            />
          </div>
          <div className="col-span-1 @3xl/dashboard:col-span-3">
            <CountCard
              title="# of Artist entities"
              value={data?.dashboardStats.artistCount}
            />
          </div>
          <div className="col-span-1 @3xl/dashboard:col-span-3">
            <CountCard
              title="# of Album entities"
              value={data?.dashboardStats.albumCount}
            />
          </div>
          <div className="col-span-1 @3xl/dashboard:col-span-4">
            <PercentageCard
              title="Reviewed files"
              value={data?.dashboardStats.reviewedFilesCount}
              total={data?.dashboardStats.musicFilesCount}
            />
          </div>
          <div className="col-span-1 @3xl/dashboard:col-span-4">
            <PercentageCard
              title="Files with lyrics"
              value={data?.dashboardStats.filesHasLyricsCount}
              total={data?.dashboardStats.musicFilesCount}
            />
          </div>
          <div className="col-span-1 @3xl/dashboard:col-span-4">
            <PercentageCard
              title="Files with cover"
              value={data?.dashboardStats.filesHasCoverCount}
              total={data?.dashboardStats.musicFilesCount}
            />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-4">Actions</h2>
        <ItemGroup className="grid grid-cols-1 @3xl/dashboard:grid-cols-3 gap-4 mb-8">
          <Item asChild variant="primary">
            <Link href="/dashboard/review">
              <ItemMedia variant="icon">
                <ClipboardEdit />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Review</ItemTitle>
                <ItemDescription>Review music files</ItemDescription>
              </ItemContent>
            </Link>
          </Item>
          <Item asChild variant="outline">
            <Link href="/dashboard/download">
              <ItemMedia variant="icon">
                <Download />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Download</ItemTitle>
                <ItemDescription>Download with YT-DLP, etc.</ItemDescription>
              </ItemContent>
            </Link>
          </Item>
          <Item asChild variant="outline">
            <Link href="/dashboard/scan">
              <ItemMedia variant="icon">
                <RefreshCw />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Scan</ItemTitle>
                <ItemDescription>Rescan local music files</ItemDescription>
              </ItemContent>
            </Link>
          </Item>
        </ItemGroup>
      </div>
    </>
  );
}
