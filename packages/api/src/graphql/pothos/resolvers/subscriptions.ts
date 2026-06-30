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

function sessionFilteredIterator(topic: string) {
  return withFilter(
    () => pubsub.asyncIterator(topic),
    (payload: PubSubSessionPayload<unknown>, args: { sessionId: string }) =>
      args.sessionId === payload.sessionId
  );
}

builder.subscriptionField("scanProgress", (t) =>
  t.field({
    type: MusicFilesScanOutcomeRef,
    nullable: true,
    description:
      "Progress of a `scan`. Session ID is required when performing search.",
    args: { sessionId: t.arg.string() },
    subscribe: (root, args, ctx, info) =>
      (sessionFilteredIterator(TOPIC_MUSIC_FILE_SCAN_PROGRESS)(
        root,
        args,
        ctx,
        info
      )) as any,
    resolve: (payload: PubSubSessionPayload<any>) => payload.data,
  })
);

builder.subscriptionField("lyricsKitSearchIncremental", (t) =>
  t.field({
    type: LyricsKitLyricsEntryRef,
    nullable: true,
    description:
      "Incremental retrieve results of a `lyricsKitSearch`. Session ID is required when performing search.",
    args: { sessionId: t.arg.string() },
    subscribe: (root, args, ctx, info) =>
      (sessionFilteredIterator(TOPIC_LYRICS_KIT_RESULT)(root, args, ctx, info)) as any,
    resolve: (payload: PubSubSessionPayload<any>) => payload.data,
  })
);

builder.subscriptionField("youTubeDlDownloadProgress", (t) =>
  t.field({
    type: YouTubeDlProgressRef,
    nullable: true,
    description:
      "Progress of a `youTubeDlDownloadVideo` mutation. Session ID is required when performing mutation.",
    args: { sessionId: t.arg.string() },
    subscribe: (root, args, ctx, info) =>
      (sessionFilteredIterator(TOPIC_YOUTUBE_DL_PROGRESS)(root, args, ctx, info)) as any,
    resolve: (payload: PubSubSessionPayload<any>) => payload.data,
  })
);
