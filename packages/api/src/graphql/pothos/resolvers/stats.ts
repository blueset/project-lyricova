import { builder } from "../builder";
import { MusicFile } from "../../../models/MusicFile";
import { Song } from "../../../models/Song";
import { Artist } from "../../../models/Artist";
import { Album } from "../../../models/Album";
import { Entry } from "../../../models/Entry";
import { Pulse } from "../../../models/Pulse";
import { Tag } from "../../../models/Tag";

const DashboardStatsRef = builder.objectRef<Record<string, never>>(
  "DashboardStats"
);

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
    musicFilesCount: t.int({ resolve: () => MusicFile.count() }),
    entriesCount: t.int({ resolve: () => Entry.count() }),
    pulsesCount: t.int({ resolve: () => Pulse.count() }),
    tagsCount: t.int({ resolve: () => Tag.count() }),
    reviewedFilesCount: t.int({
      resolve: () => MusicFile.count({ where: { needReview: false } }),
    }),
    filesHasLyricsCount: t.int({
      resolve: () => MusicFile.count({ where: { hasLyrics: true } }),
    }),
    filesHasCoverCount: t.int({
      resolve: () => MusicFile.count({ where: { hasCover: true } }),
    }),
    songCount: t.int({ resolve: () => Song.count() }),
    artistCount: t.int({ resolve: () => Artist.count() }),
    albumCount: t.int({ resolve: () => Album.count() }),
  }),
});

builder.queryField("dashboardStats", (t) =>
  t.field({
    type: DashboardStatsRef,
    authScopes: { loggedIn: true },
    resolve: () => ({}),
  })
);
