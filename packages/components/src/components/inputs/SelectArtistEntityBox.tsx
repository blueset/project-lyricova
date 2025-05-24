"use client";

// Shadcn & RHF imports needed for SelectArtistEntityBoxRHF
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
import { Badge } from "@lyricova/components/components/ui/badge";
import { Skeleton } from "@lyricova/components/components/ui/skeleton";
import { ScrollArea } from "@lyricova/components/components/ui/scroll-area";
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
import type { Artist } from "@lyricova/api/graphql/types";
import { useEffect, useState, useCallback } from "react";
import _ from "lodash";
import axios from "axios";
import { gql, useApolloClient } from "@apollo/client";
import { ArtistFragments } from "../../utils/fragments";
import { VocaDBSearchArtistDialog } from "../dialogs/VocaDBSearchArtistDialog";
import { ArtistEntityDialog } from "../dialogs/ArtistEntityDialog";
import { DocumentNode } from "graphql";
import {
  FieldValues,
  FieldPath,
  UseFormReturn,
  useController,
} from "react-hook-form";

export type ExtendedArtist = Partial<Artist> & {
  vocaDBSuggestion?: boolean;
  manual?: boolean;
  /** Internal flag for action items */
  isAction?: boolean;
};

const LOCAL_ARTIST_ENTITY_QUERY = gql`
  query ($text: String!) {
    searchArtists(keywords: $text) {
      ...SelectArtistEntry
    }
  }

  ${ArtistFragments.SelectArtistEntry}
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

export function SelectArtistEntityBox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ fieldName, labelName, title, form }: Props<TFieldValues, TName>) {
  const apolloClient = useApolloClient();
  const { field, fieldState } = useController({
    name: fieldName,
    control: form.control,
  });
  const value = field.value as ExtendedArtist | null;

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Separate states for different data sources
  const [apolloResults, setApolloResults] = useState<ExtendedArtist[]>([]);
  const [vocaDBResults, setVocaDBResults] = useState<ExtendedArtist[]>([]);
  const [isApolloLoading, setIsApolloLoading] = useState(false);
  const [isVocaDBLoading, setIsVocaDBLoading] = useState(false);

  const [importDialogKeyword, setImportDialogKeyword] = useState("");
  const [isImportDialogOpen, toggleImportDialogOpen] = useState(false);
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
          searchArtists: Artist[];
        }>({
          query: LOCAL_ARTIST_ENTITY_QUERY,
          variables: { text: searchText },
        });

        if (apolloResult.data?.searchArtists) {
          setApolloResults(apolloResult.data.searchArtists);
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
          "https://vocadb.net/api/artists/names",
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

  useEffect(() => {
    // Run both requests in parallel
    fetchApolloResults(inputValue);
    fetchVocaDBResults(inputValue);
  }, [inputValue, fetchApolloResults, fetchVocaDBResults]);

  useEffect(() => {
    // Pre-populate input text if value exists when opening
    if (open && value) {
      setInputValue(value.name || "");
    }
    if (!open) {
      setInputValue(""); // Clear search text when closing
    }
  }, [open, value]);

  const handleSelect = (selectedOptionValue: string) => {
    const allOptions = [...apolloResults, ...vocaDBResults];
    const selectedOption = allOptions.find(
      (option) => `${option.name}-${option.id}` === selectedOptionValue
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

    if (selectedOption.vocaDBSuggestion) {
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

  const isLoading = isApolloLoading || isVocaDBLoading;

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
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popper-anchor-width) max-h-(--radix-popper-available-height) p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={`Search for an artist...`}
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
                      <CommandGroup heading="Local artists">
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
                              <div className="flex flex-col flex-grow ml-2">
                                <span className="text-sm">
                                  {value.name}
                                  {value.id ? ` (#${value.id})` : ""}
                                </span>
                                {value.type && (
                                  <span className="text-xs text-muted-foreground leading-tight">
                                    {value.type}
                                  </span>
                                )}
                              </div>
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
                              <div className="flex flex-col flex-grow ml-2">
                                <span className="text-sm">
                                  {option.name}
                                  {option.id ? ` (#${option.id})` : ""}
                                </span>
                                {option.type && (
                                  <span className="text-xs text-muted-foreground leading-tight">
                                    {option.type}
                                  </span>
                                )}
                              </div>
                              {value?.id === option.id && (
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
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
                          const optionValue = `${option.name}-${option.id}`;
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
                              <div className="flex flex-col flex-grow ml-2">
                                <span className="text-sm">{option.name}</span>
                              </div>
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
                          <div className="flex items-center flex-shrink-0">
                            <Search className="text-muted-foreground" />
                          </div>
                          <div className="flex flex-col flex-grow ml-2">
                            <span className="text-sm">
                              Search VocaDB for "{inputValue}"
                            </span>
                          </div>
                        </CommandItem>
                        <CommandItem
                          value={`manual-add-${inputValue}`}
                          onSelect={handleSelect}
                          className="flex items-center cursor-pointer"
                        >
                          <div className="flex items-center flex-shrink-0">
                            <PlusCircle className="text-muted-foreground" />
                          </div>
                          <div className="flex flex-col flex-grow ml-2">
                            <span className="text-sm">
                              Manually add "{inputValue}"
                            </span>
                          </div>
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
                        <span className="ml-2">Unselect artist</span>
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
                src={value.mainPictureUrl ?? undefined}
                alt={value.name ?? "Artist picture"}
              />
              <AvatarFallback className="rounded-md">
                <Music />
              </AvatarFallback>
            </Avatar>
            <div className="flex-grow min-w-0">
              <div>
                <span className="font-medium">{value.name}</span>{" "}
                <span className="text-sm text-muted-foreground">
                  ({value.sortOrder}) #{value.id}
                </span>
              </div>
              {value.type && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary">{value.type}</Badge>
                </div>
              )}
            </div>
            <div className="flex items-center">
              {value.id >= 0 && (
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={`https://vocadb.net/Ar/${value.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink />
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setImportDialogKeyword(value.name ?? "");
                  toggleManualDialogForCreate(false);
                  toggleManualDialogOpen(true);
                }}
              >
                <Pencil />
              </Button>
            </div>
          </div>
        )}
      </div>

      {isImportDialogOpen && (
        <VocaDBSearchArtistDialog
          isOpen={isImportDialogOpen}
          toggleOpen={toggleImportDialogOpen}
          keyword={importDialogKeyword}
          setKeyword={setImportDialogKeyword}
          setArtist={(v) =>
            form.setValue(fieldName, v as any, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
      )}
      {isManualDialogOpen && (
        <ArtistEntityDialog
          isOpen={isManualDialogOpen}
          toggleOpen={toggleManualDialogOpen}
          keyword={importDialogKeyword}
          artistToEdit={value ?? undefined}
          create={isManualDialogForCreate}
          setKeyword={setImportDialogKeyword}
          setArtist={(v) =>
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
