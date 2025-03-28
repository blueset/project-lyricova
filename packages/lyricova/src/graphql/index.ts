import type { Application } from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import {
  ObjectType,
  Field,
  Int,
  Resolver,
  Query,
  Arg,
  Authorized,
  Subscription,
  Root,
  PubSub,
} from "type-graphql";
import type { Publisher } from "type-graphql";
import { buildSchema } from "type-graphql";
import { authChecker } from "lyricova-common/utils/graphQLAuth";
import bcrypt from "bcryptjs";
import _ from "lodash";
import type { Server } from "http";
import { createServer } from "http";
import cors from "cors";
import bodyParser from "body-parser";
import { EntryResolver } from "./EntryResolver";
import { SongResolver } from "./SongResolver";
import { StatsResolver } from "./StatsResolver";
import { TagResolver } from "./TagResolver";
import { TransliterationResolver } from "./TransliterationResolver";
import { UserPublicKeyCredentialResolver } from "./UserPublicKeyCredentialResolver";
import { UserResolver } from "./UserResolver";
import { VocaDBImportResolver } from "./VocaDBImportResolver";

export interface PubSubSessionPayload<T> {
  sessionId: string;
  data: T | null;
}

interface LengthyTaskPayload {
  sessionId: string;
  data: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Context {
  user?: Express.User;
}

@ObjectType({ description: "Foo is not foolish." })
class Foo {
  @Field((type) => Int, { description: "Not a value to drink." })
  bar: number;

  @Field({ description: "Name of the foo." })
  name: string;
}

@Resolver(Foo)
class FooResolver {
  // What is dependency injection ???
  // constructor(private fooService: FooService) {}

  @Query((returns) => String)
  async hash(@Arg("plaintext") plaintext: string): Promise<string> {
    return await bcrypt.hash(plaintext, 10);
  }

  @Authorized("ADMIN")
  @Query((returns) => Foo)
  foo(): Foo {
    return {
      name: "Hello world!",
      bar: 42,
    };
  }

  @Query((returns) => [Foo])
  foos(): Foo[] {
    return [
      {
        name: "Hello world!",
        bar: 42,
      },
      {
        name: "Another world",
        bar: 0,
      },
    ];
  }

  @Subscription({
    topics: "LENGTHY_TASK",
    filter: ({ payload, args }) => args.sessionId === payload.sessionId,
    nullable: true,
  })
  aLengthyTask(
    @Root() payload: LengthyTaskPayload,
    @Arg("sessionId") sessionId: string
  ): string | null {
    return payload.data;
  }

  @Query(() => [String])
  async startALengthyTask(
    @Arg("sessionId") sessionId: string,
    @PubSub("LENGTHY_TASK") publish: Publisher<LengthyTaskPayload>
  ): Promise<string[]> {
    const results: string[] = [];
    console.log(`received task for ${sessionId}`);
    for (const i of _.range(10)) {
      await sleep(1000);
      await publish({
        sessionId: sessionId,
        data: `data ${i} on session ${sessionId}`,
      });
      results.push(`data ${i} on session ${sessionId}`);
      console.log(`sent item ${i} for ${sessionId}`);
    }
    await sleep(1000);
    await publish({ sessionId: sessionId, data: null });
    return results;
  }
}

export async function applyApollo(app: Application): Promise<Server> {
  const schema = await buildSchema({
    resolvers: [
      FooResolver,
      EntryResolver,
      SongResolver,
      StatsResolver,
      TagResolver,
      TransliterationResolver,
      UserPublicKeyCredentialResolver,
      UserResolver,
      VocaDBImportResolver,
    ],
    dateScalarMode: "timestamp",
    emitSchemaFile: {
      path: __dirname + "/../../schema.graphql",
    },
    authChecker,
    validate: { forbidUnknownValues: false },
  });

  const httpServer = createServer(app);

  const apolloServer = new ApolloServer<Context>({
    schema,
    plugins: [
      // Proper shutdown for the HTTP server.
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              // subscriptionServer.close();
            },
          };
        },
      },
    ],
    cache: "bounded",
  });

  await apolloServer.start();

  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => ({ user: req.user }),
    })
  );

  return httpServer;
}
