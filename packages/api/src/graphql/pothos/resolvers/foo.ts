import bcrypt from "bcryptjs";
import _ from "lodash";
import { withFilter } from "graphql-subscriptions";
import { builder } from "../builder";
import type { PubSubSessionPayload } from "../pubsub";
import { pubsub, TOPIC_LENGTHY_TASK } from "../pubsub";

interface FooShape {
  bar: number;
  name: string;
}

const FooRef = builder.objectRef<FooShape>("Foo");

FooRef.implement({
  description: "Foo is not foolish.",
  fields: (t) => ({
    bar: t.exposeInt("bar", { description: "Not a value to drink." }),
    name: t.exposeString("name", { description: "Name of the foo." }),
  }),
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

builder.queryField("hash", (t) =>
  t.string({
    args: { plaintext: t.arg.string() },
    resolve: (_root, { plaintext }) => bcrypt.hash(plaintext, 10),
  }),
);

builder.queryField("foo", (t) =>
  t.field({
    type: FooRef,
    authScopes: { admin: true },
    resolve: () => ({ name: "Hello world!", bar: 42 }),
  }),
);

builder.queryField("foos", (t) =>
  t.field({
    type: [FooRef],
    resolve: () => [
      { name: "Hello world!", bar: 42 },
      { name: "Another world", bar: 0 },
    ],
  }),
);

builder.queryField("startALengthyTask", (t) =>
  t.field({
    type: ["String"],
    args: { sessionId: t.arg.string() },
    resolve: async (_root, { sessionId }) => {
      const results: string[] = [];
      console.log(`received task for ${sessionId}`);
      for (const i of _.range(10)) {
        await sleep(1000);
        await pubsub.publish(TOPIC_LENGTHY_TASK, {
          sessionId,
          data: `data ${i} on session ${sessionId}`,
        });
        results.push(`data ${i} on session ${sessionId}`);
        console.log(`sent item ${i} for ${sessionId}`);
      }
      await sleep(1000);
      await pubsub.publish(TOPIC_LENGTHY_TASK, { sessionId, data: null });
      return results;
    },
  }),
);

builder.subscriptionField("aLengthyTask", (t) =>
  t.string({
    nullable: true,
    args: { sessionId: t.arg.string() },
    subscribe: (root, args, ctx, info) =>
      (
        withFilter(
          () => pubsub.asyncIterableIterator(TOPIC_LENGTHY_TASK),
          (
            payload: PubSubSessionPayload<string> | undefined,
            a: { sessionId: string } | undefined,
          ) => a?.sessionId === payload?.sessionId,
        ) as unknown as (
          root: unknown,
          args: { sessionId: string },
          ctx: unknown,
          info: unknown,
        ) => AsyncIterable<PubSubSessionPayload<string>>
      )(root, args, ctx, info),
    resolve: (payload: PubSubSessionPayload<string>) => payload.data,
  }),
);
