import { Application } from "express";
import { ApolloServer } from "apollo-server-express";
import { ObjectType, Field, Int, Resolver, Query, Arg, Authorized } from "type-graphql";
import { buildSchema } from "type-graphql";
import { GraphQLString } from "graphql";
import { transliterate } from "../utils/transliterate";
import { authChecker } from "./auth";
import bcrypt from "bcryptjs";

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
  transliterate(@Arg("text") text: string): string {
    return transliterate(text);
  }

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
}

export async function applyApollo(app: Application) {

  const schema = await buildSchema({
    resolvers: [FooResolver, `${__dirname}/**/*Resolver.{ts,js}`],
    dateScalarMode: "timestamp",
    authChecker
  });
  const server = new ApolloServer({
    schema,
    context: ({ req }) => ({
      req,
      user: req.user,  // That should come from passport strategy JWT
    })
  });

  server.applyMiddleware({ app });
}