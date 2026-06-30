import { builder } from "../builder";
import { EntryRef, UserRef, PulseRef, SongRef, TagRef, VerseRef } from "./refs";

EntryRef.implement({
  description: "A Lyricova entry.",
  fields: (t) => ({
    author: t.field({
      type: UserRef,
      resolve: (e) => (e.author === undefined ? e.$get("author") : e.author),
    }),
    authorId: t.exposeFloat("authorId"),
    comment: t.exposeString("comment", { nullable: true }),
    creationDate: t.field({
      type: "Timestamp",
      resolve: (e) => e.creationDate,
    }),
    id: t.exposeFloat("id"),
    producersName: t.exposeString("producersName"),
    pulses: t.field({
      type: [PulseRef],
      nullable: true,
      resolve: (e) => (e.pulses === undefined ? e.$get("pulses") : e.pulses),
    }),
    recentActionDate: t.field({
      type: "Timestamp",
      resolve: (e) => e.recentActionDate,
    }),
    songs: t.field({
      type: [SongRef],
      nullable: true,
      resolve: (e) => (e.songs === undefined ? e.$get("songs") : e.songs),
    }),
    tags: t.field({
      type: [TagRef],
      nullable: true,
      resolve: (e) => (e.tags === undefined ? e.$get("tags") : e.tags),
    }),
    title: t.exposeString("title"),
    updatedOn: t.field({ type: "Timestamp", resolve: (e) => e.updatedOn }),
    verses: t.field({
      type: [VerseRef],
      nullable: true,
      resolve: (e) => (e.verses === undefined ? e.$get("verses") : e.verses),
    }),
    vocalistsName: t.exposeString("vocalistsName"),
  }),
});
