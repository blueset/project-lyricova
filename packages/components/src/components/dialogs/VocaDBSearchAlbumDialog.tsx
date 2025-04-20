"use client";

import { useCallback, useEffect, useState } from "react";
import type { Album } from "@lyricova/api/graphql/types";
import axios from "axios";
import type {
  PartialFindResult,
  AlbumForApiContract,
} from "@lyricova/api/graphql/types";
import _ from "lodash";
import { gql, useApolloClient } from "@apollo/client";
import { AlbumFragments } from "../../utils/fragments";
import { DocumentNode } from "graphql";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lyricova/components/components/ui/avatar";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lyricova/components/components/ui/dialog";
import {
  RadioGroup,
  RadioGroupItem,
} from "@lyricova/components/components/ui/radio-group";
import { Music, ExternalLink } from "lucide-react";
import { Skeleton } from "@lyricova/components/components/ui/skeleton";
import { Label } from "@lyricova/components/components/ui/label";

const IMPORT_ALBUM_MUTATION = gql`
  mutation ($id: Int!) {
    enrolAlbumFromVocaDB(albumId: $id) {
      ...SelectAlbumEntry
    }
  }

  ${AlbumFragments.SelectAlbumEntry}
` as DocumentNode;

interface Props {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setAlbum: (value: Partial<Album>) => void;
}

export function VocaDBSearchAlbumDialog({
  isOpen,
  toggleOpen,
  keyword,
  setKeyword,
  setAlbum,
}: Props) {
  const [results, setResults] = useState<AlbumForApiContract[]>([]);
  const [isLoaded, toggleLoaded] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [isImporting, toggleImporting] = useState(false);

  const apolloClient = useApolloClient();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
    setResults([]);
    toggleImporting(false);
    setSelectedAlbum(null);
    toggleLoaded(false);
  }, [
    toggleOpen,
    setKeyword,
    setResults,
    toggleImporting,
    setSelectedAlbum,
    toggleLoaded,
  ]);

  const handleSubmit = useCallback(async () => {
    if (selectedAlbum === null) {
      toast.error("Please choose an album to import.");
      return;
    }

    toggleImporting(true);
    try {
      const result = await apolloClient.mutate<{
        enrolAlbumFromVocaDB: Partial<Album>;
      }>({
        mutation: IMPORT_ALBUM_MUTATION,
        variables: {
          id: selectedAlbum,
        },
      });

      if (result.data) {
        setAlbum(result.data.enrolAlbumFromVocaDB);
        toast.success(
          `Album "${result.data.enrolAlbumFromVocaDB.name}" is successfully enrolled.`
        );
        handleClose();
      } else {
        toggleImporting(false);
      }
    } catch (e) {
      console.error(
        `Error occurred while importing album #${selectedAlbum}.`,
        e
      );
      toast.error(
        `Error occurred while importing album #${selectedAlbum}. (${e})`
      );
      toggleImporting(false);
    }
  }, [apolloClient, handleClose, selectedAlbum, setAlbum, toggleImporting]);

  useEffect(() => {
    if (keyword === "") return;

    let active = true;

    (async () => {
      const response = await axios.get<PartialFindResult<AlbumForApiContract>>(
        "https://vocadb.net/api/albums",
        {
          params: {
            query: keyword,
            sort: "Name",
            nameMatchMode: "Auto",
            fields: "MainPicture",
          },
        }
      );

      const idResponse = keyword.match(/^\d+$/)
        ? await axios.get<AlbumForApiContract>(
            `https://vocadb.net/api/albums/${keyword}`,
            { params: { fields: "MainPicture" } }
          )
        : null;

      if (active) {
        toggleLoaded(true);
        if (response.status === 200) {
          setResults(response.data.items!);
          if (idResponse?.status === 200) {
            setResults((res) => [idResponse.data, ...res]);
          }
        } else {
          setResults([]);
          console.error(
            "Error occurred while loading search results from VocaDB",
            response
          );
          toast.error(
            `Error occurred while loading search results from VocaDB. (${response.status} ${response.statusText})`
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [keyword, setResults, toggleLoaded]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Searching VocaDB for <span className="font-bold">{keyword}</span>
          </DialogTitle>
        </DialogHeader>

        <div>
          {isLoaded ? (
            results.length > 0 ? (
              <RadioGroup
                className="gap-4"
                value={selectedAlbum?.toString()}
                onValueChange={(value) => setSelectedAlbum(parseInt(value))}
              >
                {results.map((v) => (
                  <Label key={v.id} className="flex items-center gap-3">
                    <RadioGroupItem
                      value={v.id.toString()}
                      id={`album-${v.id}`}
                      aria-label={`${v.name} / ${v.artistString}`}
                    />
                    <Avatar className="rounded-md size-12">
                      <AvatarImage
                        src={v.mainPicture?.urlOriginal}
                        alt={v.name}
                      />
                      <AvatarFallback className="rounded-md">
                        <Music />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-base">{v.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {v.artistString}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={`https://vocadb.net/Al/${v.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink />
                      </a>
                    </Button>
                  </Label>
                ))}
              </RadioGroup>
            ) : (
              <div className="py-4 text-muted-foreground text-center">
                No result found.
              </div>
            )
          ) : (
            _.range(5).map((v) => (
              <div key={v} className="flex items-center space-x-4 py-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={selectedAlbum === null || isImporting}
            onClick={handleSubmit}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
