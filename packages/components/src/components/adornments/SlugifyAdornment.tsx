"use client";

import { useCallback, useEffect } from "react";
import slugify from "slugify";
import {
  FieldPath,
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from "react-hook-form";
import { ListRestart } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { InputGroupButton } from "@lyricova/components/components/ui/input-group";

type Props<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  form: UseFormReturn<TFieldValues>;
  sourceName: TName;
  destinationName: TName;
};

export function SlugifyAdornment<
  TFieldValues extends FieldValues = FieldValues
>({ form, sourceName, destinationName }: Props<TFieldValues>) {
  const { setValue, resetField } = form;
  const sourceValue = form.watch(sourceName);

  const convertUrl = useCallback(() => {
    const slugValue = slugify(sourceValue as string, {
      lower: true,
    }) as PathValue<TFieldValues, Path<TFieldValues>>;
    resetField(destinationName, {
      defaultValue: slugValue,
    });
    return false;
  }, [destinationName, resetField, sourceValue]);

  useEffect(() => {
    if (!form.getFieldState(destinationName).isDirty) {
      const slugValue = slugify(sourceValue as string, {
        lower: true,
      }) as PathValue<TFieldValues, Path<TFieldValues>>;
      setValue(destinationName, slugValue, {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false,
      });
    }
  }, [sourceName, destinationName, setValue, sourceValue]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <InputGroupButton size="icon-xs" onClick={convertUrl} type="button">
          <ListRestart />
        </InputGroupButton>
      </TooltipTrigger>
      <TooltipContent>Reset slug</TooltipContent>
    </Tooltip>
  );
}
