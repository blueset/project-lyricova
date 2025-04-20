"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { Button } from "@lyricova/components/components/ui/button";
import { RefreshCw } from "lucide-react";
import {
  FieldPath,
  FieldValues,
  PathValue,
  UseFormReturn,
} from "react-hook-form";

type Props<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  form: UseFormReturn<TFieldValues>;
  name: TName;
};

export function VideoThumbnailAdornment<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ form, name }: Props<TFieldValues, TName>) {
  const value = form.watch(name);

  const convertUrl = useCallback(() => {
    if (
      value.match(/(nicovideo.jp\/watch|nico.ms)\/([a-z]{2}\d{4,10}|\d{6,12})/g)
    ) {
      const numId = value.match(/\d{6,12}/g);
      if (numId) {
        form.setValue(
          name,
          `https://tn.smilevideo.jp/smile?i=${numId[0]}` as PathValue<
            TFieldValues,
            TName
          >,
          {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          }
        );
        return;
      }
    } else if (value.match(/(youtu.be\/|youtube.com\/watch\?\S*?v=)\S{11}/g)) {
      const id = /(youtu.be\/|youtube.com\/watch\?\S*?v=)(\S{11})/g.exec(
        value
      )!;
      form.setValue(
        name,
        `https://img.youtube.com/vi/${id[2]}/maxresdefault.jpg` as PathValue<
          TFieldValues,
          TName
        >,
        {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        }
      );
      return;
    } else if (
      value.match(/(i\.ytimg\.com|img\.youtube\.com).+\/default.jpg$/g)
    ) {
      form.setValue(
        name,
        value.replace(/\/default\.jpg$/, "/maxresdefault.jpg") as PathValue<
          TFieldValues,
          TName
        >,
        {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        }
      );
      return;
    }

    toast.info("URL is not from a known site, no thumbnail is converted.");
  }, [form, name, value]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          type="button"
          onClick={convertUrl}
        >
          <RefreshCw />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">Convert from video site link</TooltipContent>
    </Tooltip>
  );
}
