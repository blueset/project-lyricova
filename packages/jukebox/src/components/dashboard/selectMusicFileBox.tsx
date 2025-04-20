"use client";

import { gql, useApolloClient } from "@apollo/client";
import type { DocumentNode } from "graphql";
import type { MusicFile } from "@lyricova/api/graphql/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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
import { ScrollArea } from "@lyricova/components/components/ui/scroll-area";
import { Skeleton } from "@lyricova/components/components/ui/skeleton";
import { Music, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@lyricova/components/utils";
import { useCallback, useEffect, useState } from "react";
import _ from "lodash";
import type { FieldValues, FieldPath, UseFormReturn } from "react-hook-form";
import { useController } from "react-hook-form";

const LOCAL_ARTIST_ENTITY_QUERY = gql`
  query ($text: String!) {
    searchMusicFiles(keywords: $text) {
      id
      trackName
      trackSortOrder
      artistName
      artistSortOrder
      albumName
      albumSortOrder
      hasCover
    }
  }
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

export default function SelectMusicFileBox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ fieldName, labelName, title, form }: Props<TFieldValues, TName>) {
  const apolloClient = useApolloClient();
  const { field, fieldState } = useController({
    name: fieldName,
    control: form.control,
  });
  const value = field.value as MusicFile | null;

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<MusicFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOptions = useCallback(
    _.debounce(async (searchText: string, currentValue: MusicFile | null) => {
      if (searchText === "") {
        setOptions(currentValue ? [currentValue] : []);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      let result: MusicFile[] = [];

      try {
        const apolloResult = await apolloClient.query<{
          searchMusicFiles: MusicFile[];
        }>({
          query: LOCAL_ARTIST_ENTITY_QUERY,
          variables: { text: searchText },
        });

        if (apolloResult.data?.searchMusicFiles) {
          result = result.concat(apolloResult.data?.searchMusicFiles);
        }
      } catch (e) {
        /* No-Op. */
      }

      // Ensure current value is in options if it exists
      if (currentValue && !result.some((opt) => opt.id === currentValue.id)) {
        result = [currentValue, ...result];
      }

      setOptions(result);
      setIsLoading(false);
    }, 300),
    [apolloClient]
  );

  useEffect(() => {
    fetchOptions(inputValue, value);
  }, [inputValue, fetchOptions, value]);

  useEffect(() => {
    if (open && value) {
      setInputValue(value.trackName || "");
    }
    if (!open) {
      setInputValue("");
    }
  }, [open, value]);

  const handleSelect = (selectedOptionValue: string) => {
    const selectedOption = options.find(
      (option) => `${option.trackName}-${option.id}` === selectedOptionValue
    );

    if (!selectedOption) return;

    form.setValue(fieldName, selectedOption as any, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setOpen(false);
    setInputValue("");
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
                {value ? value.trackName : `${labelName}…`}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popper-anchor-width)] p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={"Search for a music file…"}
                  value={inputValue}
                  onValueChange={setInputValue}
                />
                <ScrollArea className="max-h-72">
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
                          const optionValue = `${option.trackName}-${option.id}`;
                          return (
                            <CommandItem
                              key={option.id}
                              value={optionValue}
                              onSelect={handleSelect}
                              className="flex items-center cursor-pointer"
                            >
                              <div className="flex items-center flex-shrink-0">
                                <Avatar className="h-8 w-8 rounded-md border border-border">
                                  <AvatarImage
                                    className="object-contain"
                                    src={
                                      option.hasCover
                                        ? `/api/files/${option.id}/cover`
                                        : undefined
                                    }
                                    alt={option.trackName ?? "Music file cover"}
                                  />
                                  <AvatarFallback className="rounded-md">
                                    <Music />
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="flex flex-col flex-grow ml-2">
                                <span className="text-sm">
                                  {option.trackName}
                                </span>
                                <span className="text-xs text-muted-foreground leading-tight">
                                  {option.artistName || <em>Unknown artist</em>}{" "}
                                  / {option.albumName || <em>Unknown album</em>}
                                </span>
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

        {value && (
          <div className="flex items-center flex-row gap-2 p-2 border rounded-md">
            <Avatar className="h-14 w-14 rounded-md border border-border">
              <AvatarImage
                className="object-contain"
                src={
                  value.hasCover ? `/api/files/${value.id}/cover` : undefined
                }
                alt={value.trackName ?? "Music file cover"}
              />
              <AvatarFallback className="rounded-md">
                <Music />
              </AvatarFallback>
            </Avatar>
            <div className="flex-grow min-w-0">
              <div>
                <span className="font-medium">{value.trackName}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {value.artistName || <em>Unknown artist</em>} /{" "}
                {value.albumName || <em>Unknown album</em>}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
