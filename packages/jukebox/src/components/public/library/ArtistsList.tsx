"use client";

import type { VDBArtistType } from "../../../types/vocadb";
import { gql, useQuery } from "@apollo/client";
import type { Artist } from "@lyricova/api/graphql/types";
import React from "react";
import { SquareUserRound } from "lucide-react";
import { NextComposedLink } from "@lyricova/components";
import type { DocumentNode } from "graphql";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import { cn } from "@lyricova/components/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lyricova/components/components/ui/avatar";

const ARTISTS_LIST_QUERY = gql`
  query ($types: [String!]!) {
    artistsHasFiles(types: $types) {
      id
      name
      sortOrder
      type
      mainPictureUrl
    }
  }
` as DocumentNode;

interface Props {
  types: VDBArtistType[];
  typeName: "producers" | "vocalists";
}

export default function ArtistsList({ types, typeName }: Props) {
  const query = useQuery<{ artistsHasFiles: Artist[] }>(ARTISTS_LIST_QUERY, {
    variables: { types },
  });

  if (query.loading)
    return (
      <Alert
        variant="info"
        className="bg-blue-50 text-blue-800 border-blue-200"
      >
        <AlertDescription>Loading...</AlertDescription>
      </Alert>
    );

  if (query.error)
    return (
      <Alert variant="error">
        <AlertDescription>Error: {`${query.error}`}</AlertDescription>
      </Alert>
    );

  let lastKey: string | null = null;
  const convertedList: (Artist | string)[] = [];

  query.data.artistsHasFiles.forEach((i) => {
    let key: string;
    if (i.sortOrder === null || i.sortOrder === "") key = "?";
    else {
      const firstChar = i.sortOrder.charAt(0);
      if (firstChar.codePointAt(0) < 65 /* "A" */) key = "#";
      else key = firstChar.toLocaleUpperCase();
    }
    if (key !== lastKey) {
      convertedList.push(key);
      lastKey = key;
    }
    convertedList.push(i);
  });

  return (
    <div className="p-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-2">
        {convertedList.map((v) => {
          if (typeof v === "string") {
            return (
              <div className="col-span-full" key={`header-${v}`}>
                <h2 className="text-xl font-semibold">{v}</h2>
                <hr className="mt-2" />
              </div>
            );
          } else {
            return (
              <NextComposedLink
                key={`artist-${v.id}`}
                href={`/library/${typeName}/${v.id}`}
                className="-m-2 p-2 flex flex-row items-center hover:bg-accent/50 rounded-md"
              >
                <Avatar className="size-16 mr-4 rounded-md">
                  <AvatarImage
                    src={v.mainPictureUrl}
                    alt={v.name}
                    className="object-top object-cover"
                    loading="lazy"
                  />
                  <AvatarFallback className="text-lg rounded-md">
                    <SquareUserRound />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-grow overflow-hidden">
                  <p lang="ja" className="text-base">
                    {v.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {v.type
                      .replace("Other", "")
                      .split(/(?=[A-Z])/)
                      .join(" ")
                      .replace("U T A U", "UTAU")
                      .replace(" V I O", "VIO")}
                  </p>
                </div>
              </NextComposedLink>
            );
          }
        })}
      </div>
    </div>
  );
}
