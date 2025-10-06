"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@lyricova/components/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lyricova/components/components/ui/popover";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lyricova/components/components/ui/avatar";
import { Skeleton } from "@lyricova/components/components/ui/skeleton";
import { ScrollArea } from "@lyricova/components/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { cn } from "@lyricova/components/utils";
import {
  Music,
  Search,
  PlusCircle,
  ExternalLink,
  Pencil,
  ChevronsUpDown,
  Check,
  X,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import _ from "lodash";
import axios from "axios";
import { gql, useApolloClient } from "@apollo/client";
import type { Album } from "@lyricova/api/graphql/types";
import { VocaDBSearchAlbumDialog } from "../dialogs/VocaDBSearchAlbumDialog";
import { UtaiteDBSearchAlbumDialog } from "../dialogs/UtaiteDBSearchAlbumDialog";
import { AlbumEntityDialog } from "../dialogs/AlbumEntityDialog";
import { AlbumFragments } from "../../utils/fragments";
import { DocumentNode } from "graphql";
import {
  FieldValues,
  FieldPath,
  UseFormReturn,
  useController,
} from "react-hook-form";

export type ExtendedAlbum = Partial<Album> & {
  vocaDBSuggestion?: boolean;
  utaiteDBSuggestion?: boolean;
  manual?: boolean;
  /** Internal flag for action items */
  isAction?: boolean;
};

const LOCAL_ALBUM_ENTITY_QUERY = gql`
  query ($text: String!) {
    searchAlbums(keywords: $text) {
      ...SelectAlbumEntry
    }
  }

  ${AlbumFragments.SelectAlbumEntry}
` as DocumentNode;

interface Props<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  form: UseFormReturn<TFieldValues>;
  fieldName: TName;
  labelName: string;
  title?: string;
}

export function SelectAlbumEntityBox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ fieldName, labelName, title, form }: Props<TFieldValues, TName>) {
  const apolloClient = useApolloClient();
  const { field, fieldState } = useController({
    name: fieldName,
    control: form.control,
  });
  const value = field.value as ExtendedAlbum | null;

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Separate states for different data sources
  const [apolloResults, setApolloResults] = useState<ExtendedAlbum[]>([]);
  const [vocaDBResults, setVocaDBResults] = useState<ExtendedAlbum[]>([]);
  const [utaiteDBResults, setUtaiteDBResults] = useState<ExtendedAlbum[]>([]);
  const [isApolloLoading, setIsApolloLoading] = useState(false);
  const [isVocaDBLoading, setIsVocaDBLoading] = useState(false);
  const [isUtaiteDBLoading, setIsUtaiteDBLoading] = useState(false);

  const [importDialogKeyword, setImportDialogKeyword] = useState("");
  const [isImportDialogOpen, toggleImportDialogOpen] = useState(false);
  const [utaiteDBDialogKeyword, setUtaiteDBDialogKeyword] = useState("");
  const [isUtaiteDBDialogOpen, toggleUtaiteDBDialogOpen] = useState(false);
  const [isManualDialogOpen, toggleManualDialogOpen] = useState(false);
  const [isManualDialogForCreate, toggleManualDialogForCreate] = useState(true);

  const fetchApolloResults = useCallback(
    _.debounce(async (searchText: string) => {
      if (searchText === "") {
        setApolloResults([]);
        setIsApolloLoading(false);
        return;
      }

      setIsApolloLoading(true);
      try {
        const apolloResult = await apolloClient.query<{
          searchAlbums: Album[];
        }>({
          query: LOCAL_ALBUM_ENTITY_QUERY,
          variables: { text: searchText },
        });

        if (apolloResult.data?.searchAlbums) {
          setApolloResults(apolloResult.data.searchAlbums);
        }
      } catch (e) {
        setApolloResults([]);
      } finally {
        setIsApolloLoading(false);
      }
    }, 300),
    [apolloClient]
  );

  const fetchVocaDBResults = useCallback(
    _.debounce(async (searchText: string) => {
      if (searchText === "") {
        setVocaDBResults([]);
        setIsVocaDBLoading(false);
        return;
      }

      setIsVocaDBLoading(true);
      try {
        const vocaDBResult = await axios.get<string[]>(
          "https://vocadb.net/api/albums/names",
          {
            params: {
              query: searchText,
              nameMatchMode: "Auto",
            },
          }
        );

        if (vocaDBResult.status === 200 && vocaDBResult.data) {
          setVocaDBResults(
            vocaDBResult.data.map((v) => ({
              id: undefined,
              name: v,
              sortOrder: `"${v}"`,
              vocaDBSuggestion: true,
            }))
          );
        }
      } catch (e) {
        setVocaDBResults([]);
      } finally {
        setIsVocaDBLoading(false);
      }
    }, 300),
    []
  );

  const fetchUtaiteDBResults = useCallback(
    _.debounce(async (searchText: string) => {
      if (searchText === "") {
        setUtaiteDBResults([]);
        setIsUtaiteDBLoading(false);
        return;
      }

      setIsUtaiteDBLoading(true);
      try {
        const utaiteDBResult = await axios.get<string[]>(
          "https://utaitedb.net/api/albums/names",
          {
            params: {
              query: searchText,
              nameMatchMode: "Auto",
            },
          }
        );

        if (utaiteDBResult.status === 200 && utaiteDBResult.data) {
          setUtaiteDBResults(
            utaiteDBResult.data.map((v) => ({
              id: undefined,
              name: v,
              sortOrder: `"${v}"`,
              utaiteDBSuggestion: true,
            }))
          );
        }
      } catch (e) {
        setUtaiteDBResults([]);
      } finally {
        setIsUtaiteDBLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    // Run all requests in parallel
    fetchApolloResults(inputValue);
    fetchVocaDBResults(inputValue);
    fetchUtaiteDBResults(inputValue);
  }, [
    inputValue,
    fetchApolloResults,
    fetchVocaDBResults,
    fetchUtaiteDBResults,
  ]);

  useEffect(() => {
    if (open && value) {
      setInputValue(value.name || "");
    }
    if (!open) {
      setInputValue("");
    }
  }, [open, value]);

  const handleSelect = (selectedOptionValue: string) => {
    const allOptions = [...apolloResults, ...vocaDBResults, ...utaiteDBResults];
    const selectedOption = allOptions.find(
      (option) =>
        `${option.name}-${
          option.vocaDBSuggestion
            ? "v"
            : option.utaiteDBSuggestion
            ? "u"
            : option.id
        }` === selectedOptionValue
    );

    if (!selectedOption) {
      // Handle action items
      if (selectedOptionValue === `search-vocadb-${inputValue}`) {
        setImportDialogKeyword(inputValue);
        toggleImportDialogOpen(true);
        setOpen(false);
        setInputValue("");
        return;
      }
      if (selectedOptionValue === `search-utaitedb-${inputValue}`) {
        setUtaiteDBDialogKeyword(inputValue);
        toggleUtaiteDBDialogOpen(true);
        setOpen(false);
        setInputValue("");
        return;
      }
      if (selectedOptionValue === `manual-add-${inputValue}`) {
        setImportDialogKeyword(inputValue);
        toggleManualDialogForCreate(true);
        toggleManualDialogOpen(true);
        setOpen(false);
        setInputValue("");
        form.setValue(fieldName, null as any);
        return;
      }
      return;
    }

    if (selectedOption.utaiteDBSuggestion) {
      setUtaiteDBDialogKeyword(selectedOption?.sortOrder ?? "");
      toggleUtaiteDBDialogOpen(true);
      setOpen(false);
      setInputValue("");
    } else if (selectedOption.vocaDBSuggestion) {
      setImportDialogKeyword(selectedOption?.sortOrder ?? "");
      toggleImportDialogOpen(true);
      setOpen(false);
      setInputValue("");
    } else {
      form.setValue(fieldName, selectedOption as any, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setOpen(false);
      setInputValue("");
    }
  };

  const isLoading = isApolloLoading || isVocaDBLoading || isUtaiteDBLoading;

  return (
    <>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="grid grid-cols-1 gap-2 w-full">
        <div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between text-muted-foreground"
              >
                <span className="truncate">
                  {value
                    ? `${value.name}${value.id ? ` (#${value.id})` : ""}`
                    : `Select ${labelName}...`}
                </span>
                <ChevronsUpDown className="ml-2 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popper-anchor-width) max-h-(--radix-popper-available-height) p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={`Search for an album...`}
                  value={inputValue}
                  onValueChange={setInputValue}
                />
                <ScrollArea>
                  <CommandList>
                    <CommandEmpty>Enter keywords to search.</CommandEmpty>

                    {/* Loading skeleton */}
                    {isLoading && (
                      <CommandGroup heading="Loading…">
                        <CommandItem disabled>
                          <Skeleton className="h-8 w-full" />
                        </CommandItem>
                      </CommandGroup>
                    )}

                    {/* Apollo results */}
                    {(apolloResults.length > 0 ||
                      (value &&
                        !apolloResults.some(
                          (option) => option.id === value.id
                        ))) && (
                      <CommandGroup heading="Local albums">
                        {/* Current value if not found in Apollo results */}
                        {value &&
                          !apolloResults.some(
                            (option) => option.id === value.id
                          ) && (
                            <CommandItem
                              key={value.id ?? value.name}
                              value={`${value.name}-${value.id}`}
                              onSelect={handleSelect}
                              className="flex items-center cursor-pointer"
                            >
                              <div className="flex items-center flex-shrink-0">
                                <Music className="text-muted-foreground" />
                              </div>
                              <span className="ml-2">
                                {value.name} {value.id ? ` (#${value.id})` : ""}
                              </span>
                              <Check className="ml-auto opacity-100" />
                            </CommandItem>
                          )}
                        {apolloResults.map((option) => {
                          const optionValue = `${option.name}-${option.id}`;
                          return (
                            <CommandItem
                              key={option.id ?? option.name}
                              value={optionValue}
                              onSelect={handleSelect}
                              className="flex items-center cursor-pointer"
                            >
                              <div className="flex items-center flex-shrink-0">
                                <Music className="text-muted-foreground" />
                              </div>
                              <span className="ml-2">
                                {option.name}{" "}
                                {option.id ? ` (#${option.id})` : ""}
                              </span>
                              {value?.id && value?.id === option.id && (
                                <Check
                                  className={cn(
                                    "ml-auto",
                                    value?.id === option.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}

                    {/* VocaDB suggestions */}
                    {vocaDBResults.length > 0 && (
                      <CommandGroup heading="VocaDB suggestions">
                        {vocaDBResults.map((option) => {
                          const optionValue = `${option.name}-v`;
                          return (
                            <CommandItem
                              key={option.name}
                              value={optionValue}
                              onSelect={handleSelect}
                              className="flex items-center cursor-pointer"
                            >
                              <div className="flex items-center flex-shrink-0">
                                <ExternalLink className="text-muted-foreground" />
                              </div>
                              <span className="ml-2">{option.name}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}

                    {/* UtaiteDB suggestions */}
                    {utaiteDBResults.length > 0 && (
                      <CommandGroup heading="UtaiteDB suggestions">
                        {utaiteDBResults.map((option) => {
                          const optionValue = `${option.name}-u`;
                          return (
                            <CommandItem
                              key={option.name}
                              value={optionValue}
                              onSelect={handleSelect}
                              className="flex items-center cursor-pointer"
                            >
                              <div className="flex items-center flex-shrink-0">
                                <ExternalLink className="text-muted-foreground" />
                              </div>
                              <span className="ml-2">{option.name}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}

                    <CommandSeparator />

                    {/* Action items - always visible when there's input */}
                    {inputValue && (
                      <CommandGroup heading="Actions">
                        <CommandItem
                          value={`search-vocadb-${inputValue}`}
                          onSelect={handleSelect}
                          className="flex items-center cursor-pointer"
                        >
                          <Search className="text-muted-foreground" />
                          <span className="ml-2">
                            Search VocaDB for “{inputValue}”
                          </span>
                        </CommandItem>
                        <CommandItem
                          value={`search-utaitedb-${inputValue}`}
                          onSelect={handleSelect}
                          className="flex items-center cursor-pointer"
                        >
                          <Search className="text-muted-foreground" />
                          <span className="ml-2">
                            Search UtaiteDB for “{inputValue}”
                          </span>
                        </CommandItem>
                        <CommandItem
                          value={`manual-add-${inputValue}`}
                          onSelect={handleSelect}
                          className="flex items-center cursor-pointer"
                        >
                          <PlusCircle className="text-muted-foreground" />
                          <span className="ml-2">
                            Manually add “{inputValue}”
                          </span>
                        </CommandItem>
                      </CommandGroup>
                    )}

                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          form.setValue(fieldName, null as any, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          setOpen(false);
                          setInputValue("");
                        }}
                        className="cursor-pointer"
                      >
                        <X className="text-muted-foreground" />
                        <span className="ml-2">Unselect album</span>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </ScrollArea>
              </Command>
            </PopoverContent>
          </Popover>
          {fieldState.error && (
            <p className="text-sm text-destructive mt-1">
              {fieldState.error.message}
            </p>
          )}
        </div>

        {value && value.id && (
          <div className="flex items-center flex-row gap-2 p-2 border rounded-md">
            <Avatar className="size-14 w-14 h-14 rounded-md border border-border">
              <AvatarImage
                className="object-contain"
                src={value.coverUrl ?? undefined}
                alt={value.name ?? "Album cover"}
              />
              <AvatarFallback className="rounded-md">
                <Music />
              </AvatarFallback>
            </Avatar>
            <div className="flex-grow min-w-0">
              <div>
                <span className="font-medium">{value.name}</span>{" "}
                <span className="text-sm text-muted-foreground">
                  {value.sortOrder === value.name ? "" : value.sortOrder} #
                  {value.id}
                </span>
              </div>
            </div>
            <div className="flex items-center">
              <TooltipProvider>
                {value.id >= 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={`https://vocadb.net/Al/${value.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-300"
                        >
                          <ExternalLink />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View on VocaDB</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {!!value.utaiteDbId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={`https://utaitedb.net/Al/${value.utaiteDbId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-300"
                        >
                          <ExternalLink />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View on UtaiteDB</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setImportDialogKeyword(value.name ?? "");
                  toggleManualDialogForCreate(false);
                  toggleManualDialogOpen(true);
                }}
                type="button"
              >
                <Pencil />
              </Button>
            </div>
          </div>
        )}
      </div>

      {isImportDialogOpen && (
        <VocaDBSearchAlbumDialog
          isOpen={isImportDialogOpen}
          toggleOpen={toggleImportDialogOpen}
          keyword={importDialogKeyword}
          setKeyword={setImportDialogKeyword}
          setAlbum={(v) =>
            form.setValue(fieldName, v as any, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
      )}
      {isUtaiteDBDialogOpen && (
        <UtaiteDBSearchAlbumDialog
          isOpen={isUtaiteDBDialogOpen}
          toggleOpen={toggleUtaiteDBDialogOpen}
          keyword={utaiteDBDialogKeyword}
          setKeyword={setUtaiteDBDialogKeyword}
          setAlbum={(v) =>
            form.setValue(fieldName, v as any, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
      )}
      {isManualDialogOpen && (
        <AlbumEntityDialog
          isOpen={isManualDialogOpen}
          toggleOpen={toggleManualDialogOpen}
          keyword={importDialogKeyword}
          setKeyword={setImportDialogKeyword}
          albumToEdit={value ?? undefined}
          create={isManualDialogForCreate}
          setAlbum={(v) =>
            form.setValue(fieldName, v as any, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
      )}
    </>
  );
}
