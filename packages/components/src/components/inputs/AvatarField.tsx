import {
  Avatar as ShadcnAvatar,
  AvatarImage,
  AvatarFallback,
} from "@lyricova/components/components/ui/avatar";
import { Music } from "lucide-react";
import { FieldValues, FieldPath, UseFormReturn } from "react-hook-form";
import { cn } from "@/utils";

type AvatarFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  form: UseFormReturn<TFieldValues>; // Replace with the correct type for your form
  name: TName;
  className?: string;
};

export function AvatarField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ form, name, className }: AvatarFieldProps<TFieldValues, TName>) {
  const src = form.watch(name);
  return (
    <ShadcnAvatar className={cn("rounded-md", className)}>
      <AvatarImage src={src} className="rounded-md object-contain" />
      <AvatarFallback className="rounded-md">
        <Music />
      </AvatarFallback>
    </ShadcnAvatar>
  );
}
