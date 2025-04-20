"use client";

import type { Artist } from "@lyricova/api/graphql/types";
import { useCallback } from "react";
import { gql, useApolloClient } from "@apollo/client";
import { TransliterationAdornment } from "../adornments/TransliterationAdornment";
import { toast } from "sonner";
import { z } from "zod";
import { ArtistFragments } from "../../utils/fragments";
import { DocumentNode } from "graphql";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lyricova/components/components/ui/form";
import { Input } from "@lyricova/components/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lyricova/components/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from "@lyricova/components/components/ui/sheet";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AvatarField } from "../inputs/AvatarField";

const NEW_ARTIST_MUTATION = gql`
  mutation ($data: ArtistInput!) {
    newArtist(data: $data) {
      ...SelectArtistEntry
    }
  }

  ${ArtistFragments.SelectArtistEntry}
` as DocumentNode;

const UPDATE_ARTIST_MUTATION = gql`
  mutation ($id: Int!, $data: ArtistInput!) {
    updateArtist(id: $id, data: $data) {
      ...SelectArtistEntry
    }
  }

  ${ArtistFragments.SelectArtistEntry}
` as DocumentNode;

const formSchema = z.object({
  name: z.string().min(1, "Artist name is required"),
  sortOrder: z.string().min(1, "Artist sort order is required"),
  mainPictureUrl: z
    .string()
    .url("Main picture URL is not a valid URL.")
    .optional()
    .or(z.literal("")),
  type: z.string().min(1, "Type must be selected"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  isOpen: boolean;
  create?: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setArtist: (value: Partial<Artist>) => void;
  artistToEdit?: Partial<Artist>;
}

export function ArtistEntityDialog({
  isOpen,
  toggleOpen,
  keyword,
  setKeyword,
  setArtist,
  create,
  artistToEdit,
}: Props) {
  const apolloClient = useApolloClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values:
      create || !artistToEdit
        ? {
            name: keyword,
            sortOrder: "",
            mainPictureUrl: "",
            type: "Unknown",
          }
        : {
            name: artistToEdit.name ?? "",
            sortOrder: artistToEdit.sortOrder ?? "",
            mainPictureUrl: artistToEdit.mainPictureUrl ?? "",
            type: artistToEdit.type ?? "",
          },

    resetOptions: {
      keepDefaultValues: true,
    },
  });

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
  }, [toggleOpen, setKeyword]);

  const artistId = artistToEdit?.id ?? null;

  const onSubmit = async (data: FormValues) => {
    try {
      if (create) {
        const result = await apolloClient.mutate<{
          newArtist: Partial<Artist>;
        }>({
          mutation: NEW_ARTIST_MUTATION,
          variables: { data },
        });

        if (result.data) {
          setArtist(result.data.newArtist);
          toast.success(
            `Artist "${result.data.newArtist.name}" is successfully created.`
          );
          handleClose();
        }
      } else {
        const result = await apolloClient.mutate<{
          updateArtist: Partial<Artist>;
        }>({
          mutation: UPDATE_ARTIST_MUTATION,
          variables: { id: artistId, data },
        });

        if (result.data) {
          setArtist(result.data.updateArtist);
          toast.success(
            `Artist "${result.data.updateArtist.name}" is successfully updated.`
          );
          apolloClient.cache.evict({ id: `Artist:${artistId}` });
          handleClose();
        }
      }
    } catch (e) {
      console.error(
        `Error occurred while ${create ? "creating" : "updating"} artist #${
          data.name
        }.`,
        e
      );
      toast.error(
        `Error occurred while ${create ? "creating" : "updating"} artist #${
          data.name
        }. (${e})`
      );
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-5/6 md:max-w-lg lg:max-w-2xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full"
          >
            <SheetHeader>
              <SheetTitle>
                {create
                  ? "Create new artist entity"
                  : `Edit artist entity #${artistId}`}
              </SheetTitle>
            </SheetHeader>

            <div className="grow basis-0 flex flex-col gap-4 overflow-auto py-4 px-6 -mx-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort order</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <TransliterationAdornment
                        form={form}
                        sourceName="name"
                        destinationName="sortOrder"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mainPictureUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main picture URL</FormLabel>
                    <div className="flex items-center gap-2">
                      <AvatarField
                        form={form}
                        className="size-12"
                        name="mainPictureUrl"
                      />
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Unknown">Unknown</SelectItem>
                        <SelectItem value="Circle">Circle</SelectItem>
                        <SelectItem value="Label">Label</SelectItem>
                        <SelectItem value="Producer">Producer</SelectItem>
                        <SelectItem value="Animator">Animator</SelectItem>
                        <SelectItem value="Illustrator">Illustrator</SelectItem>
                        <SelectItem value="Lyricist">Lyricist</SelectItem>
                        <SelectItem value="Vocaloid">Vocaloid</SelectItem>
                        <SelectItem value="UTAU">UTAU</SelectItem>
                        <SelectItem value="CeVIO">CeVIO</SelectItem>
                        <SelectItem value="OtherVoiceSynthesizer">
                          Other Voice Synthesizer
                        </SelectItem>
                        <SelectItem value="OtherVocalist">
                          Other Vocalist
                        </SelectItem>
                        <SelectItem value="OtherGroup">Other Group</SelectItem>
                        <SelectItem value="OtherIndividual">
                          Other Individual
                        </SelectItem>
                        <SelectItem value="Utaite">Utaite</SelectItem>
                        <SelectItem value="Band">Band</SelectItem>
                        <SelectItem value="Vocalist">Vocalist</SelectItem>
                        <SelectItem value="Character">Character</SelectItem>
                        <SelectItem value="SynthesizerV">
                          SynthesizerV
                        </SelectItem>
                        <SelectItem value="CoverArtist">CoverArtist</SelectItem>
                        <SelectItem value="NEUTRINO">NEUTRINO</SelectItem>
                        <SelectItem value="VoiSona">VoiSona</SelectItem>
                        <SelectItem value="NewType">NewType</SelectItem>
                        <SelectItem value="Voiceroid">Voiceroid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter className="flex-row justify-end">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {create ? "Create" : "Update"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
