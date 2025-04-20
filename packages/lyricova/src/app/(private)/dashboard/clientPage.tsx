"use client";

import { gql, useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import { CountCard, CountUpCard } from "@lyricova/components";
import type { DashboardStats } from "@lyricova/api/graphql/types";
import { NavHeader } from "./NavHeader";

const DASHBOARD_STATS_QUERY = gql`
  query {
    dashboardStats {
      aliveStartedOn
      revampStartedOn
      entriesCount
      pulsesCount
      tagsCount
    }
  }
`;

type ConvertedDashboardStats = Record<keyof DashboardStats, number>;

export default function DashboardIndex() {
  const [now, setNow] = useState(new Date());
  const { data } = useQuery<{ dashboardStats: ConvertedDashboardStats }>(
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
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">
        <div className="mb-2">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 @3xl/dashboard:col-span-6">
              <CountUpCard
                title="Revamp dev time"
                now={now}
                time={data?.dashboardStats.revampStartedOn}
              />
            </div>
            <div className="col-span-12 @3xl/dashboard:col-span-6">
              <CountUpCard
                title="Project uptime"
                now={now}
                time={data?.dashboardStats.aliveStartedOn}
              />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-6 @2xl/dashboard:col-span-4">
              <CountCard
                title="# of entries"
                value={data?.dashboardStats.entriesCount}
              />
            </div>
            <div className="col-span-6 @2xl/dashboard:col-span-4">
              <CountCard
                title="# of pulses"
                value={data?.dashboardStats.pulsesCount}
              />
            </div>
            <div className="col-span-6 @2xl/dashboard:col-span-4">
              <CountCard
                title="# of tags"
                value={data?.dashboardStats.tagsCount}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
