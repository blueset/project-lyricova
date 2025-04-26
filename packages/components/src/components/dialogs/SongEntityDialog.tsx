"use client";

import type { Song } from "@lyricova/api/graphql/types";
import { Fragment, useCallback } from "react";
import { gql, useApolloClient } from "@apollo/client";
import { toast } from "sonner";
import { Plus, Disc3, Music, Trash } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from "@lyricova/components/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lyricova/components/components/ui/form";
import { Input } from "@lyricova/components/components/ui/input";
import { Button } from "@lyricova/components/components/ui/button";
import { Separator } from "@lyricova/components/components/ui/separator";
import { Checkbox } from "@lyricova/components/components/ui/checkbox";
import { MultiSelect } from "@lyricova/components/components/ui/multi-select";

import { TransliterationAdornment } from "../adornments/TransliterationAdornment";
import { VideoThumbnailAdornment } from "../adornments/VideoThumbnailAdornment";
import { TrackNameAdornment } from "../adornments/TrackNameAdornment";
import { SelectSongEntityBox } from "../inputs/SelectSongEntityBox";
import { SelectArtistEntityBox } from "../inputs/SelectArtistEntityBox";
import { SelectAlbumEntityBox } from "../inputs/SelectAlbumEntityBox";
import { AvatarField } from "../inputs/AvatarField";
import { SongFragments } from "../../utils/fragments";

interface MultiSelectOption {
  value: string;
  label: string;
}

const rolesChoices: MultiSelectOption[] = [
  { value: "Default", label: "Default" },
  { value: "Composer", label: "Composer" },
  { value: "Lyricist", label: "Lyricist" },
  { value: "Arranger", label: "Arranger" },
  { value: "Vocalist", label: "Vocalist" },
  { value: "Animator", label: "Animator" },
  { value: "Distributor", label: "Distributor" },
  { value: "Illustrator", label: "Illustrator" },
  { value: "Instrumentalist", label: "Instrumentalist" },
  { value: "Mastering", label: "Mastering" },
  { value: "Publisher", label: "Publisher" },
  { value: "VoiceManipulator", label: "Voice Manipulator" },
  { value: "Other", label: "Other" },
  { value: "Mixer", label: "Mixer" },
  { value: "Chorus", label: "Chorus" },
  { value: "Encoder", label: "Encoder" },
  { value: "VocalDataProvider", label: "Vocal Data Provider" },
];

const artistRolesChoices: MultiSelectOption[] = [
  { value: "Nothing", label: "Nothing" },
  { value: "Vocalist", label: "Vocalist" },
  { value: "Producer", label: "Producer" },
  { value: "Animator", label: "Animator" },
  { value: "Label", label: "Label" },
  { value: "Circle", label: "Circle" },
  { value: "Other", label: "Other" },
  { value: "Band", label: "Band" },
  { value: "Illustrator", label: "Illustrator" },
  { value: "Subject", label: "Subject" },
];

const formSchema = z.object({
  name: z.string().min(1, "Required"),
  sortOrder: z.string().min(1, "Required"),
  coverUrl: z.string().url().optional().or(z.literal("")),
  originalSong: z.any().optional(),
  artists: z.array(
    z.object({
      artist: z
        .any()
        .refine((val) => val !== null, "Artist entity must be selected"),
      artistRoles: z.array(z.string()),
      categories: z.array(z.string()),
      customName: z.string().optional().or(z.literal("")),
      isSupport: z.boolean(),
    })
  ),
  albums: z.array(
    z.object({
      album: z
        .any()
        .refine((val) => val !== null, "Album entity must be selected"),
      diskNumber: z.number().positive().int().optional(),
      trackNumber: z.number().positive().int().optional().or(z.literal("")),
      name: z.string().min(1, "Required"),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

const NEW_SONG_MUTATION = gql`
  mutation ($data: SongInput!) {
    newSong(data: $data) {
      ...SelectSongEntry
    }
  }

  ${SongFragments.SelectSongEntry}
`;

const UPDATE_SONG_MUTATION = gql`
  mutation ($id: Int!, $data: SongInput!) {
    updateSong(id: $id, data: $data) {
      ...SelectSongEntry
    }
  }

  ${SongFragments.SelectSongEntry}
`;

interface Props {
  isOpen: boolean;
  create?: boolean;
  toggleOpen: (value: boolean) => void;
  keyword?: string;
  setKeyword: (value: string) => void;
  setSong: (value: Partial<Song>) => void;
  songToEdit?: Partial<Song>;
}

export function SongEntityDialog({
  isOpen,
  toggleOpen,
  keyword,
  setKeyword,
  setSong,
  songToEdit,
  create,
}: Props) {
  const apolloClient = useApolloClient();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
  }, [toggleOpen, setKeyword]);

  const defaultValues: FormValues =
    create || !songToEdit
      ? {
          name: keyword ?? "",
          sortOrder: "",
          coverUrl: "",
          originalSong: undefined,
          artists: [],
          albums: [],
        }
      : {
          name: songToEdit.name ?? "",
          sortOrder: songToEdit.sortOrder ?? "",
          coverUrl: songToEdit.coverUrl ?? "",
          originalSong: songToEdit.original ?? undefined,
          artists:
            songToEdit.artists?.map((v) => ({
              ...v.ArtistOfSong,
              customName: v.ArtistOfSong.customName ?? "",
              artist: v,
            })) ?? [],
          albums:
            songToEdit.albums?.map((v) => ({
              ...v.SongInAlbum,
              name: v.SongInAlbum.name ?? "",
              diskNumber: v.SongInAlbum.diskNumber ?? undefined,
              trackNumber: v.SongInAlbum.trackNumber ?? undefined,
              album: v,
            })) ?? [],
        };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: defaultValues,
    resetOptions: {
      keepDirtyValues: true,
    },
    mode: "onChange",
  });

  const songId = songToEdit?.id ?? null;

  async function onSubmit(values: FormValues) {
    try {
      const data = {
        name: values.name,
        sortOrder: values.sortOrder,
        coverUrl: values.coverUrl || "",
        originalId: values.originalSong?.id ?? null,
        songInAlbums: values.albums.map((v) => ({
          name: v.name,
          diskNumber: v.diskNumber,
          trackNumber: v.trackNumber,
          albumId: v.album.id,
        })),
        artistsOfSong: values.artists.map((v) => ({
          categories: v.categories,
          artistRoles: v.artistRoles,
          isSupport: v.isSupport,
          customName: v.customName || "",
          artistId: v.artist.id,
        })),
      };

      if (create) {
        const result = await apolloClient.mutate<{
          newSong: Partial<Song>;
        }>({
          mutation: NEW_SONG_MUTATION,
          variables: {
            data,
          },
        });

        if (result.data) {
          setSong(result.data.newSong);
          toast.success(
            `Song "${result.data.newSong.name}" is successfully created.`
          );
          handleClose();
        }
      } else {
        const result = await apolloClient.mutate<{
          updateSong: Partial<Song>;
        }>({
          mutation: UPDATE_SONG_MUTATION,
          variables: {
            id: songId,
            data,
          },
        });

        if (result.data) {
          setSong(result.data.updateSong);
          toast.success(
            `Song "${result.data.updateSong.name}" is successfully updated.`
          );
          apolloClient.cache.evict({ id: `Song:${songId}` });
          handleClose();
        }
      }
    } catch (e) {
      console.error(
        `Error occurred while ${create ? "creating" : "updating"} song ${
          values?.name
        }.`,
        e
      );
      toast.error(
        `Error occurred while ${create ? "creating" : "updating"} song ${
          values?.name
        }. (${e})`
      );
    }
  }

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
                  ? "Create new song entity"
                  : `Edit song entity #${songId}`}
              </SheetTitle>
            </SheetHeader>

            <div className="grow basis-0 flex flex-col gap-4 overflow-auto py-4 px-6 -mx-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Track name</FormLabel>
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
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input {...field} />
                          <TransliterationAdornment
                            form={form}
                            sourceName="name"
                            destinationName="sortOrder"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coverUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover URL</FormLabel>
                      <div className="flex items-center gap-2">
                        <AvatarField
                          form={form}
                          name="coverUrl"
                          className="size-12"
                        />
                        <FormControl>
                          <div className="flex items-center gap-2 flex-1">
                            <Input {...field} />
                            <VideoThumbnailAdornment
                              name="coverUrl"
                              form={form}
                            />
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <SelectSongEntityBox
                  form={form}
                  fieldName="originalSong"
                  labelName="Original song"
                />
              </div>

              {/* Artists Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Artists</h3>
                <div className="space-y-4">
                  {form.watch("artists")?.map((_, index) => (
                    <Fragment key={index}>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <SelectArtistEntityBox
                            form={form}
                            fieldName={`artists.${index}.artist`}
                            labelName="Artist"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            type="button"
                            onClick={() => {
                              const artists = form.getValues("artists");
                              artists.splice(index, 1);
                              form.setValue("artists", artists);
                            }}
                          >
                            <Trash />
                          </Button>
                        </div>

                        <div className="flex gap-4">
                          <FormField
                            control={form.control}
                            name={`artists.${index}.artistRoles`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Roles</FormLabel>
                                <MultiSelect
                                  isMulti
                                  onChange={(selected) => {
                                    field.onChange(
                                      selected
                                        ? selected.map((option) => option.value)
                                        : []
                                    );
                                  }}
                                  value={field.value.map((v) => ({
                                    value: v,
                                    label:
                                      rolesChoices.find(
                                        (option) => option.value === v
                                      )?.label ?? v,
                                  }))}
                                  placeholder="Select roles"
                                  options={rolesChoices}
                                  getOptionValue={(value) => value.value}
                                  getOptionLabel={(value) => value.label}
                                />
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`artists.${index}.categories`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Categories</FormLabel>
                                <MultiSelect
                                  isMulti
                                  onChange={(selected) => {
                                    field.onChange(
                                      selected
                                        ? selected.map((option) => option.value)
                                        : []
                                    );
                                  }}
                                  value={field.value.map((v) => ({
                                    value: v,
                                    label:
                                      artistRolesChoices.find(
                                        (option) => option.value === v
                                      )?.label ?? v,
                                  }))}
                                  placeholder="Select categories"
                                  options={artistRolesChoices}
                                  getOptionValue={(value) => value.value}
                                  getOptionLabel={(value) => value.label}
                                />
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`artists.${index}.artist`}
                            render={({ field }) =>
                              field.value?.type === "Producer" ? (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  type="button"
                                  className="mt-5.5"
                                  onClick={() => {
                                    form.setValue(
                                      `artists.${index}.artistRoles`,
                                      ["Composer", "Lyricist"]
                                    );
                                    form.setValue(
                                      `artists.${index}.categories`,
                                      ["Producer"]
                                    );
                                  }}
                                >
                                  P
                                </Button>
                              ) : field.value?.type === "Vocaloid" ||
                                field.value?.type === "UTAU" ||
                                field.value?.type === "CeVIO" ||
                                field.value?.type === "OtherVoiceSynthesizer" ||
                                field.value?.type === "OtherVocalist" ||
                                field.value?.type === "Utaite" ||
                                field.value?.type === "Vocalist" ||
                                field.value?.type === "CoverArtist" ||
                                field.value?.type === "SynthesizerV" ||
                                field.value?.type === "NEUTRINO" ||
                                field.value?.type === "VoiSona" ||
                                field.value?.type === "NewType" ||
                                field.value?.type === "Voiceroid" ? (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  type="button"
                                  className="mt-5.5"
                                  onClick={() => {
                                    form.setValue(
                                      `artists.${index}.artistRoles`,
                                      ["Vocalist"]
                                    );
                                    form.setValue(
                                      `artists.${index}.categories`,
                                      ["Vocalist"]
                                    );
                                  }}
                                >
                                  V
                                </Button>
                              ) : (
                                <></>
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <FormField
                            control={form.control}
                            name={`artists.${index}.isSupport`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Support</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`artists.${index}.customName`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input {...field} placeholder="Custom name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <Separator className="my-4" />
                    </Fragment>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const artists = form.getValues("artists") || [];
                      form.setValue("artists", [
                        ...artists,
                        {
                          artist: null,
                          artistRoles: ["Default"],
                          categories: ["Nothing"],
                          customName: "",
                          isSupport: false,
                        },
                      ]);
                    }}
                  >
                    <Plus />
                    Add artist
                  </Button>
                </div>
              </div>

              {/* Albums Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Albums</h3>
                <div className="space-y-4">
                  {form.watch("albums")?.map((_, index) => (
                    <Fragment key={index}>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <SelectAlbumEntityBox
                            form={form}
                            fieldName={`albums.${index}.album`}
                            labelName="Album"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            type="button"
                            onClick={() => {
                              const albums = form.getValues("albums");
                              albums.splice(index, 1);
                              form.setValue("albums", albums);
                            }}
                          >
                            <Trash />
                          </Button>
                        </div>

                        <div className="flex gap-4">
                          <FormField
                            control={form.control}
                            name={`albums.${index}.diskNumber`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Disk number</FormLabel>
                                <FormControl>
                                  <div className="flex items-center">
                                    <Disc3 className="mr-2" />
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(e.target.valueAsNumber)
                                      }
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`albums.${index}.trackNumber`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Track number</FormLabel>
                                <FormControl>
                                  <div className="flex items-center">
                                    <Music className="mr-2" />
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(e.target.valueAsNumber)
                                      }
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <FormField
                            control={form.control}
                            name={`albums.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Track name</FormLabel>
                                <FormControl>
                                  <div className="flex items-center gap-2">
                                    <Input {...field} />
                                    <TrackNameAdornment
                                      form={form}
                                      sourceName="name"
                                      destinationName={`albums.${index}.name`}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <Separator className="my-4" />
                    </Fragment>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const albums = form.getValues("albums") || [];
                      form.setValue("albums", [
                        ...albums,
                        {
                          name: form.getValues("name") ?? "",
                        },
                      ]);
                    }}
                  >
                    <Plus />
                    Add Album
                  </Button>
                </div>
              </div>
            </div>

            <SheetFooter className="flex-row justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>
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
