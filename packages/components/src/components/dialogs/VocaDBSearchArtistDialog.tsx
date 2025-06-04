"use client";

import { useCallback, useEffect, useState } from "react";
import type { Artist } from "@lyricova/api/graphql/types";
import axios from "axios";
import type {
  PartialFindResult,
  ArtistForApiContract,
} from "@lyricova/api/graphql/types";
import _ from "lodash";
import { gql, useApolloClient } from "@apollo/client";
import { ArtistFragments } from "../../utils/fragments";
import type { DocumentNode } from "graphql";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lyricova/components/components/ui/avatar";
import { Button } from "@lyricova/components/components/ui/button";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
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

const IMPORT_SONG_MUTATION = gql`
  mutation ($id: Int!) {
    enrolArtistFromVocaDB(artistId: $id) {
      ...SelectArtistEntry
    }
  }

  ${ArtistFragments.SelectArtistEntry}
` as DocumentNode;

interface Props {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setArtist: (value: Partial<Artist>) => void;
}

export function VocaDBSearchArtistDialog({
  isOpen,
  toggleOpen,
  keyword,
  setKeyword,
  setArtist,
}: Props) {
  const [results, setResults] = useState<ArtistForApiContract[]>([]);
  const [isLoaded, toggleLoaded] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<number | null>(null);
  const [isImporting, toggleImporting] = useState(false);

  const apolloClient = useApolloClient();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
    setResults([]);
    toggleImporting(false);
    setSelectedArtist(null);
    toggleLoaded(false);
  }, [
    toggleOpen,
    setKeyword,
    setResults,
    toggleImporting,
    setSelectedArtist,
    toggleLoaded,
  ]);

  const handleSubmit = useCallback(async () => {
    if (selectedArtist === null) {
      toast.error("Please choose an artist to import.");
      return;
    }

    toggleImporting(true);
    try {
      const result = await apolloClient.mutate<{
        enrolArtistFromVocaDB: Partial<Artist>;
      }>({
        mutation: IMPORT_SONG_MUTATION,
        variables: {
          id: selectedArtist,
        },
      });
      if (result.data) {
        setArtist(result.data.enrolArtistFromVocaDB);
        toast.success(
          `Artist "${result.data.enrolArtistFromVocaDB.name}" is successfully enrolled.`
        );
        handleClose();
      } else {
        toggleImporting(false);
      }
    } catch (e) {
      console.error(
        `Error occurred while importing artist #${selectedArtist}.`,
        e
      );
      toast.error(
        `Error occurred while importing artist #${selectedArtist}. (${e})`
      );
      toggleImporting(false);
    }
  }, [apolloClient, handleClose, selectedArtist, setArtist, toggleImporting]);

  useEffect(() => {
    if (keyword === "") return;

    let active = true;

    (async () => {
      const response = await axios.get<PartialFindResult<ArtistForApiContract>>(
        "https://vocadb.net/api/artists",
        {
          params: {
            query: keyword,
            sort: "SongCount",
            nameMatchMode: "Auto",
            fields: "MainPicture",
          },
        }
      );

      const idResponse = keyword.match(/^\d+$/)
        ? await axios.get<ArtistForApiContract>(
            `https://vocadb.net/api/artists/${keyword}`,
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
      <DialogContent className="max-w-2xl grid-rows-[auto_1fr_auto]">
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
                value={selectedArtist?.toString()}
                onValueChange={(value) => setSelectedArtist(parseInt(value))}
              >
                {results.map((v) => (
                  <Label key={v.id} className="flex items-center gap-3">
                    <RadioGroupItem
                      value={v.id.toString()}
                      id={`artist-${v.id}`}
                      aria-label={`${v.name} (${v.artistType})`}
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
                        {v.artistType}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={`https://vocadb.net/Ar/${v.id}`}
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
          <ProgressButton
            progress={selectedArtist === null || isImporting}
            onClick={handleSubmit}
          >
            Import
          </ProgressButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
