"use client";

import { useCallback } from "react";
import { Copy, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { InputGroupButton } from "@lyricova/components/components/ui/input-group";
import {
  FieldPath,
  FieldValues,
  PathValue,
  UseFormReturn,
} from "react-hook-form";

type Props<
  TFieldValues extends FieldValues = FieldValues,
  TSourceName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TDestName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  form: UseFormReturn<TFieldValues>;
  sourceName: TSourceName;
  destinationName: TDestName;
};

export function TrackNameAdornment<
  TFieldValues extends FieldValues = FieldValues,
  TSourceName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TDestName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  form,
  sourceName,
  destinationName,
}: Props<TFieldValues, TSourceName, TDestName>) {
  const trackName = form.watch(sourceName);
  const value = form.watch(destinationName);

  const trackNameButtonCallback = useCallback(() => {
    if (value === "" || value == null) {
      form.setValue(
        destinationName,
        trackName as PathValue<TFieldValues, TDestName>,
        {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        }
      );
    } else {
      form.setValue(destinationName, "" as PathValue<TFieldValues, TDestName>, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  }, [form, destinationName, trackName, value]);

  if (trackName === "" && value === "") return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <InputGroupButton
          size="icon-xs"
          type="button"
          onClick={trackNameButtonCallback}
        >
          {!value ? <Copy /> : <X />}
        </InputGroupButton>
      </TooltipTrigger>
      <TooltipContent side="left">
        {!value ? "Copy from track name" : "Clear"}
      </TooltipContent>
    </Tooltip>
  );
}
