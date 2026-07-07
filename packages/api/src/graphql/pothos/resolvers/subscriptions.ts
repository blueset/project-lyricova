import { withFilter } from "graphql-subscriptions";
import { builder } from "../builder";
import {
  pubsub,
  TOPIC_MUSIC_FILE_SCAN_PROGRESS,
  TOPIC_LYRICS_KIT_RESULT,
  TOPIC_YOUTUBE_DL_PROGRESS,
  PubSubSessionPayload,
} from "../pubsub";
import { MusicFilesScanOutcomeRef } from "../types/pagination";
import { YouTubeDlProgressRef } from "../types/download";
import { LyricsKitLyricsEntryRef } from "./lyricsProviders";

function sessionFilteredIterator(
  topic: string,
): (
  root: unknown,
  args: { sessionId: string },
  ctx: unknown,
  info: unknown,
) => AsyncIterable<PubSubSessionPayload<unknown>> {
  // `graphql-subscriptions` types `withFilter` as returning an `AsyncIterator`,
  // but the value it produces is also async-iterable (what Pothos `subscribe`
  // requires); bridge the under-typed return in this single place.
  return withFilter(
    () => pubsub.asyncIterableIterator(topic),
    (
      payload: PubSubSessionPayload<unknown> | undefined,
      args: { sessionId: string } | undefined,
    ) => args?.sessionId === payload?.sessionId,
  ) as unknown as (
    root: unknown,
    args: { sessionId: string },
    ctx: unknown,
    info: unknown,
  ) => AsyncIterable<PubSubSessionPayload<unknown>>;
}

builder.subscriptionField("scanProgress", (t) =>
  t.field({
    type: MusicFilesScanOutcomeRef,
    nullable: true,
    description:
      "Progress of a `scan`. Session ID is required when performing search.",
    args: { sessionId: t.arg.string() },
    subscribe: (root, args, ctx, info) =>
      sessionFilteredIterator(TOPIC_MUSIC_FILE_SCAN_PROGRESS)(
        root,
        args,
        ctx,
        info,
      ),
    resolve: (payload: PubSubSessionPayload<any>) => payload.data,
  }),
);

builder.subscriptionField("lyricsKitSearchIncremental", (t) =>
  t.field({
    type: LyricsKitLyricsEntryRef,
    nullable: true,
    description:
      "Incremental retrieve results of a `lyricsKitSearch`. Session ID is required when performing search.",
    args: { sessionId: t.arg.string() },
    subscribe: (root, args, ctx, info) =>
      sessionFilteredIterator(TOPIC_LYRICS_KIT_RESULT)(root, args, ctx, info),
    resolve: (payload: PubSubSessionPayload<any>) => payload.data,
  }),
);

builder.subscriptionField("youTubeDlDownloadProgress", (t) =>
  t.field({
    type: YouTubeDlProgressRef,
    nullable: true,
    description:
      "Progress of a `youTubeDlDownloadVideo` mutation. Session ID is required when performing mutation.",
    args: { sessionId: t.arg.string() },
    subscribe: (root, args, ctx, info) =>
      sessionFilteredIterator(TOPIC_YOUTUBE_DL_PROGRESS)(root, args, ctx, info),
    resolve: (payload: PubSubSessionPayload<any>) => payload.data,
  }),
);
