import { Application } from "express";
import { ApolloServer } from "apollo-server-express";
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
  Args,
  PubSub, Publisher
} from "type-graphql";
import { buildSchema } from "type-graphql";
import { GraphQLSchema, GraphQLString } from "graphql";
import { authChecker } from "./auth";
import bcrypt from "bcryptjs";
import _ from "lodash";

export interface PubSubSessionPayload<T> {
  sessionId: string;
  data: T | null;
}

interface LengthyTaskPayload {
  sessionId: string;
  data: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

@ObjectType({ description: "Foo is not foolish." })
class Foo {
  @Field(type => Int, { description: "Not a value to drink." })
  bar: number;

  @Field({ description: "Name of the foo." })
  name: string;
}

@Resolver(Foo)
class FooResolver {
  // What is dependency injection ???
  // constructor(private fooService: FooService) {}

  @Query(returns => GraphQLString)
  async hash(@Arg("plaintext") plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, 10);
  }

  @Authorized("ADMIN")
  @Query(returns => Foo)
  foo(): Foo {
    return {
      name: "Hello world!",
      bar: 42
    };
  }

  @Query(returns => [Foo])
  foos(): Foo[] {
    return [
      {
        name: "Hello world!",
        bar: 42
      },
      {
        name: "Another world",
        bar: 0
      }
    ];
  }

  @Subscription({
    topics: "LENGTHY_TASK",
    filter: ({ payload, args }) => args.sessionId === payload.sessionId,
    nullable: true,
  })
  aLengthyTask(
    @Root() payload: LengthyTaskPayload,
    @Arg("sessionId") sessionId: string,
  ): string | null {
    return payload.data;
  }

  @Query(() => [String])
  async startALengthyTask(
    @Arg("sessionId") sessionId: string,
    @PubSub("LENGTHY_TASK") publish: Publisher<LengthyTaskPayload>,
  ): Promise<string[]> {
    const results: string[] = [];
    console.log(`received task for ${sessionId}`);
    for (const i of _.range(10)) {
      await sleep(1000);
      await publish({ sessionId: sessionId, data: `data ${i} on session ${sessionId}` });
      results.push(`data ${i} on session ${sessionId}`);
      console.log(`sent item ${i} for ${sessionId}`);
    }
    await sleep(1000);
    await publish({ sessionId: sessionId, data: null });
    return results;
  }
}

export async function applyApollo(app: Application): Promise<ApolloServer> {

  const schema = await buildSchema({
    // `FooResolver as unknown as string` is a workaround to mitigate the 
    // strict type check of type-graphql.buildSchema({resolvers})
    resolvers: [FooResolver as unknown as string, `${__dirname}/**/*Resolver.{ts,js}`],
    dateScalarMode: "timestamp",
    emitSchemaFile: {
      path: __dirname + "/../../schema.graphql",
      commentDescriptions: true,
    },
    authChecker
  });

  const server = new ApolloServer({
    schema,
    context: ({ req, connection }) => {
      if (connection) return connection.context;
      return {
        req,
        user: req.user,  // That should come from passport strategy JWT
      };
    }
  });

  server.applyMiddleware({ app });

  return server;
}