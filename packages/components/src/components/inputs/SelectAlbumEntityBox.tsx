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
  const [options, setOptions] = useState<ExtendedAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [importDialogKeyword, setImportDialogKeyword] = useState("");
  const [isImportDialogOpen, toggleImportDialogOpen] = useState(false);
  const [isManualDialogOpen, toggleManualDialogOpen] = useState(false);
  const [isManualDialogForCreate, toggleManualDialogForCreate] = useState(true);

  const fetchOptions = useCallback(
    _.debounce(
      async (searchText: string, currentValue: ExtendedAlbum | null) => {
        if (searchText === "") {
          setOptions(currentValue ? [currentValue] : []);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        let result: ExtendedAlbum[] = [];

        const apolloPromise = apolloClient.query<{ searchAlbums: Album[] }>({
          query: LOCAL_ALBUM_ENTITY_QUERY,
          variables: { text: searchText },
        });

        const vocaDBPromise = axios.get<string[]>(
          "https://vocadb.net/api/albums/names",
          {
            params: {
              query: searchText,
              nameMatchMode: "Auto",
            },
          }
        );

        try {
          const apolloResult = await apolloPromise;
          if (apolloResult.data?.searchAlbums) {
            result = result.concat(apolloResult.data?.searchAlbums);
          }
        } catch (e) {
          /* No-Op. */
        }

        try {
          const vocaDBResult = await vocaDBPromise;
          if (vocaDBResult.status === 200 && vocaDBResult.data) {
            result = result.concat(
              vocaDBResult.data.map((v) => ({
                id: undefined,
                name: v,
                sortOrder: `"${v}"`,
                vocaDBSuggestion: true,
                isAction: true, // Mark as action
              }))
            );
          }
        } catch (e) {
          /* No-Op. */
        }

        // Ensure current value is in options if it exists and isn't already there
        if (currentValue && !result.some((opt) => opt.id === currentValue.id)) {
          result = [currentValue, ...result];
        }

        // Add special options
        result.push({
          id: undefined,
          name: `Search VocaDB for "${searchText}"`,
          sortOrder: searchText,
          vocaDBSuggestion: true,
          isAction: true,
        });
        result.push({
          id: undefined,
          name: `Manually add "${searchText}"`,
          sortOrder: searchText,
          manual: true,
          isAction: true,
        });

        setOptions(result);
        setIsLoading(false);
      },
      300
    ),
    [apolloClient]
  );

  useEffect(() => {
    fetchOptions(inputValue, value);
  }, [inputValue, fetchOptions, value]);

  useEffect(() => {
    if (open && value) {
      setInputValue(value.name || "");
    }
    if (!open) {
      setInputValue("");
    }
  }, [open, value]);

  const handleSelect = (selectedOptionValue: string) => {
    const selectedOption = options.find(
      (option) => `${option.name}-${option.id}` === selectedOptionValue
    );

    if (!selectedOption) return;

    if (selectedOption.vocaDBSuggestion && selectedOption.isAction) {
      setImportDialogKeyword(selectedOption?.sortOrder ?? "");
      toggleImportDialogOpen(true);
      setOpen(false);
      setInputValue("");
    } else if (selectedOption.manual && selectedOption.isAction) {
      setImportDialogKeyword(selectedOption?.sortOrder ?? "");
      toggleManualDialogForCreate(true);
      toggleManualDialogOpen(true);
      setOpen(false);
      setInputValue("");
      form.setValue(fieldName, null as any);
    } else {
      form.setValue(fieldName, selectedOption as any, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setOpen(false);
      setInputValue("");
    }
  };

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
                    {isLoading && (
                      <CommandItem disabled>
                        <Skeleton className="h-8 w-full" />
                      </CommandItem>
                    )}
                    <CommandEmpty>Enter keywords to search.</CommandEmpty>
                    {!isLoading && (
                      <CommandGroup>
                        {options.map((option) => {
                          const optionValue = `${option.name}-${option.id}`; // Unique value for CommandItem
                          let icon = (
                            <Music className="text-muted-foreground" />
                          );
                          if (option.vocaDBSuggestion && option.isAction)
                            icon = <Search className="text-muted-foreground" />;
                          else if (option.manual && option.isAction)
                            icon = (
                              <PlusCircle className="text-muted-foreground" />
                            );

                          return (
                            <CommandItem
                              key={option.id ?? option.name}
                              value={optionValue}
                              onSelect={handleSelect}
                              className="flex items-center cursor-pointer"
                            >
                              <div className="flex items-center flex-shrink-0">
                                {icon}
                              </div>
                              <span className="ml-2">
                                {option.name}{" "}
                                {option.id ? ` (#${option.id})` : ""}
                              </span>
                              {value?.id &&
                                value?.id === option.id &&
                                !option.isAction && (
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
              {value.id >= 0 && (
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={`https://vocadb.net/Al/${value.id}`}
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
