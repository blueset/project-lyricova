import { builder } from "../builder.js";
import { MusicFileRef } from "./refs.js";

interface PaginationInfoShape {
  endCursor: string | null;
  hasNextPage: boolean;
}

const PaginationInfoRef =
  builder.objectRef<PaginationInfoShape>("PaginationInfo");

PaginationInfoRef.implement({
  fields: (t) => ({
    endCursor: t.exposeString("endCursor", { nullable: true }),
    hasNextPage: t.exposeBoolean("hasNextPage"),
  }),
});

export interface MusicFilesPaginationEdgeShape {
  cursor: string;
  node: any;
}

const MusicFilesPaginationEdgeRef =
  builder.objectRef<MusicFilesPaginationEdgeShape>("MusicFilesPaginationEdge");

MusicFilesPaginationEdgeRef.implement({
  fields: (t) => ({
    cursor: t.exposeString("cursor"),
    node: t.field({ type: MusicFileRef, resolve: (e) => e.node }),
  }),
});

export interface MusicFilesPaginationShape {
  totalCount: number;
  edges: MusicFilesPaginationEdgeShape[];
  pageInfo: PaginationInfoShape;
}

export const MusicFilesPaginationRef =
  builder.objectRef<MusicFilesPaginationShape>("MusicFilesPagination");

MusicFilesPaginationRef.implement({
  fields: (t) => ({
    totalCount: t.exposeInt("totalCount"),
    edges: t.field({
      type: [MusicFilesPaginationEdgeRef],
      resolve: (p) => p.edges,
    }),
    pageInfo: t.field({ type: PaginationInfoRef, resolve: (p) => p.pageInfo }),
  }),
});

export interface MusicFilesScanOutcomeShape {
  added: number;
  deleted: number;
  updated: number;
  unchanged: number;
  total: number;
}

export const MusicFilesScanOutcomeRef =
  builder.objectRef<MusicFilesScanOutcomeShape>("MusicFilesScanOutcome");

MusicFilesScanOutcomeRef.implement({
  fields: (t) => ({
    added: t.exposeInt("added"),
    deleted: t.exposeInt("deleted"),
    updated: t.exposeInt("updated"),
    unchanged: t.exposeInt("unchanged"),
    total: t.exposeInt("total"),
  }),
});
