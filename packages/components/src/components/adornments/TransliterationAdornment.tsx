"use client";

import { gql, useApolloClient } from "@apollo/client";
import { useCallback } from "react";
import { DocumentNode } from "graphql";
import {
  FieldPath,
  FieldValues,
  UseFormReturn,
  PathValue,
} from "react-hook-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import { RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { InputGroupButton } from "@lyricova/components/components/ui/input-group";

const TRANSLITRATION_QUERY = gql`
  query ($text: String!, $language: String) {
    transliterate(text: $text) {
      plain(language: $language)
    }
  }
` as DocumentNode;

type Props<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  form: UseFormReturn<TFieldValues>;
  sourceName: TName;
  destinationName: TName;
};

export function TransliterationAdornment<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ form, sourceName, destinationName }: Props<TFieldValues, TName>) {
  const apolloClient = useApolloClient();
  const sourceValue = form.watch(sourceName);

  const transliterateCallback = useCallback(
    (language?: "zh" | "ja") => async () => {
      try {
        const result = await apolloClient.query<{
          transliterate: { plain: string };
        }>({
          query: TRANSLITRATION_QUERY,
          variables: {
            text: sourceValue,
            language,
          },
          fetchPolicy: "no-cache",
        });

        form.setValue(
          destinationName,
          result.data.transliterate.plain as PathValue<TFieldValues, TName>,
          {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          }
        );
      } catch (e) {
        // No-op.
      }
    },
    [apolloClient, destinationName, form, sourceValue]
  );

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <InputGroupButton size="icon-xs" type="button">
              <RefreshCw />
            </InputGroupButton>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem lang="zh" onClick={transliterateCallback("zh")}>
            中文 → zhōngwén
          </DropdownMenuItem>
          <DropdownMenuItem lang="ja" onClick={transliterateCallback("ja")}>
            日本語 → にほんご
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent side="left">Transliterate</TooltipContent>
    </Tooltip>
  );
}
