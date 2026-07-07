import { eq } from "drizzle-orm";
import { builder } from "../builder";
import { db } from "../../../drizzle/client";
import {
  MusicFiles,
  Songs,
  Artists,
  Albums,
  Entries,
  Pulses,
  Tags,
} from "../../../drizzle/schema";

const DashboardStatsRef =
  builder.objectRef<Record<string, never>>("DashboardStats");

DashboardStatsRef.implement({
  fields: (t) => ({
    revampStartedOn: t.field({
      type: "Timestamp",
      resolve: () => new Date("2020-06-20T23:44:48"),
    }),
    aliveStartedOn: t.field({
      type: "Timestamp",
      resolve: () => new Date("2013-05-20T23:41:56"),
    }),
    musicFilesCount: t.int({ resolve: () => db.$count(MusicFiles) }),
    entriesCount: t.int({ resolve: () => db.$count(Entries) }),
    pulsesCount: t.int({ resolve: () => db.$count(Pulses) }),
    tagsCount: t.int({ resolve: () => db.$count(Tags) }),
    reviewedFilesCount: t.int({
      resolve: () => db.$count(MusicFiles, eq(MusicFiles.needReview, false)),
    }),
    filesHasLyricsCount: t.int({
      resolve: () => db.$count(MusicFiles, eq(MusicFiles.hasLyrics, true)),
    }),
    filesHasCoverCount: t.int({
      resolve: () => db.$count(MusicFiles, eq(MusicFiles.hasCover, true)),
    }),
    songCount: t.int({ resolve: () => db.$count(Songs) }),
    artistCount: t.int({ resolve: () => db.$count(Artists) }),
    albumCount: t.int({ resolve: () => db.$count(Albums) }),
  }),
});

builder.queryField("dashboardStats", (t) =>
  t.field({
    type: DashboardStatsRef,
    authScopes: { loggedIn: true },
    resolve: () => ({}),
  }),
);
