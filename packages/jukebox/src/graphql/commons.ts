import { ArgsType, Field, Int, ObjectType } from "type-graphql";
import { Min, Max } from "class-validator";

@ArgsType()
export class PaginationArgs {
  @Field({ nullable: true })
  after?: string;

  @Field(type => Int, { defaultValue: 25 })
  @Min(1)
  first = 25;
}

@ObjectType()
export class PaginationInfo {
  @Field({ nullable: true })
  endCursor: string | null;

  @Field()
  hasNextPage: boolean;
}