import { PubSub } from "graphql-subscriptions";

/**
 * Shared PubSub used by Pothos mutations (publishers) and subscriptions
 * (consumers), replacing TypeGraphQL's `@PubSub`/`@Subscription` wiring.
 */
export const pubsub = new PubSub();

export const TOPIC_MUSIC_FILE_SCAN_PROGRESS = "MUSIC_FILE_SCAN_PROGRESS";
export const TOPIC_LENGTHY_TASK = "LENGTHY_TASK";
export const TOPIC_LYRICS_KIT_RESULT = "LYRICS_KIT_RESULT";
export const TOPIC_YOUTUBE_DL_PROGRESS = "YOUTUBE_DL_PROGRESS";

export interface PubSubSessionPayload<T> {
  sessionId: string;
  data: T | null;
}
