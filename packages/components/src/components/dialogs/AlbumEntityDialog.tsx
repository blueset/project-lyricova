"use client";

import type { Album } from "@lyricova/api/graphql/types";
import type { Artist } from "@lyricova/api/graphql/types";
import type { Song } from "@lyricova/api/graphql/types";
import { Fragment, useCallback } from "react";
import { gql, useApolloClient } from "@apollo/client";
import { toast } from "sonner";
import { Plus, X, Disc3, Music, Trash, RefreshCw } from "lucide-react";
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
import { MultiSelect } from "@lyricova/components/components/ui/multi-select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@lyricova/components/components/ui/tooltip";

import { TransliterationAdornment } from "../adornments/TransliterationAdornment";
import { VideoThumbnailAdornment } from "../adornments/VideoThumbnailAdornment";
import { TrackNameAdornment } from "../adornments/TrackNameAdornment";
import { SelectSongEntityBox } from "../inputs/SelectSongEntityBox";
import { SelectArtistEntityBox } from "../inputs/SelectArtistEntityBox";
import { AvatarField } from "../inputs/AvatarField";
import { AlbumFragments } from "../../utils/fragments";

interface MultiSelectOption {
  value: string;
  label: string;
}

const rolesChoices: MultiSelectOption[] = [
  { value: "Default", label: "Default" },
  { value: "Animator", label: "Animator" },
  { value: "Arranger", label: "Arranger" },
  { value: "Composer", label: "Composer" },
  { value: "Distributor", label: "Distributor" },
  { value: "Illustrator", label: "Illustrator" },
  { value: "Instrumentalist", label: "Instrumentalist" },
  { value: "Lyricist", label: "Lyricist" },
  { value: "Mastering", label: "Mastering" },
  { value: "Publisher", label: "Publisher" },
  { value: "Vocalist", label: "Vocalist" },
  { value: "VoiceManipulator", label: "Voice Manipulator" },
  { value: "Other", label: "Other" },
  { value: "Mixer", label: "Mixer" },
  { value: "Chorus", label: "Chorus" },
  { value: "Encoder", label: "Encoder" },
  { value: "VocalDataProvider", label: "Vocal Data Provider" },
];

const artistCategoryChoices: MultiSelectOption[] = [
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
  artists: z.array(
    z.object({
      artist: z
        .any()
        .refine((val) => val !== null, "Artist entity must be selected"),
      roles: z.array(z.string()),
      effectiveRoles: z.array(z.string()),
      categories: z.string(),
    })
  ),
  songs: z.array(
    z.object({
      song: z
        .any()
        .refine((val) => val !== null, "Song entity must be selected"),
      diskNumber: z.number().positive().int().optional(),
      trackNumber: z.number().positive().int().optional(),
      name: z.string().optional(),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

const NEW_ALBUM_MUTATION = gql`
  mutation ($data: AlbumInput!) {
    newAlbum(data: $data) {
      ...SelectAlbumEntry
    }
  }

  ${AlbumFragments.SelectAlbumEntry}
`;

const UPDATE_ALBUM_MUTATION = gql`
  mutation ($id: Int!, $data: AlbumInput!) {
    updateAlbum(id: $id, data: $data) {
      ...SelectAlbumEntry
    }
  }

  ${AlbumFragments.SelectAlbumEntry}
`;

const FULL_ALBUM_QUERY = gql`
  query ($id: Int!) {
    album(id: $id) {
      ...FullAlbumEntry
    }
  }

  ${AlbumFragments.FullAlbumEntry}
`;

interface Props {
  isOpen: boolean;
  create?: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setAlbum: (value: Partial<Album>) => void;
  albumToEdit?: Partial<Album>;
}

export function AlbumEntityDialog({
  isOpen,
  toggleOpen,
  keyword,
  setKeyword,
  setAlbum,
  create,
  albumToEdit,
}: Props) {
  const apolloClient = useApolloClient();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
  }, [toggleOpen, setKeyword]);

  const defaultValues: FormValues =
    create || !albumToEdit
      ? {
          name: keyword,
          sortOrder: "",
          coverUrl: "",
          artists: [],
          songs: [],
        }
      : {
          name: albumToEdit.name ?? "",
          sortOrder: albumToEdit.sortOrder ?? "",
          coverUrl: albumToEdit.coverUrl ?? "",
          artists:
            albumToEdit.artists?.map((v) => ({
              ...v.ArtistOfAlbum,
              artist: v,
            })) ?? [],
          songs:
            albumToEdit.songs?.map((v) => ({
              ...v.SongInAlbum,
              song: v,
              diskNumber: v.SongInAlbum.diskNumber ?? undefined,
              trackNumber: v.SongInAlbum.trackNumber ?? undefined,
            })) ?? [],
        };

  const albumId = albumToEdit?.id ?? null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: defaultValues,
    resetOptions: {
      keepDefaultValues: true,
    },
    mode: "onChange",
  });

  const refresh = useCallback(async () => {
    try {
      const result = await apolloClient.query<{ album: Album }>({
        query: FULL_ALBUM_QUERY,
        variables: {
          id: albumId,
        },
      });
      apolloClient.cache.evict({ id: `Album:${albumId}` });
      if (result.data.album) {
        const album = result.data.album;
        form.reset({
          name: album.name,
          sortOrder: album.sortOrder,
          coverUrl: album.coverUrl!,
          artists:
            album.artists?.map((v) => ({
              ...v.ArtistOfAlbum,
              artist: v,
            })) ?? [],
          songs:
            album.songs?.map((v) => ({
              ...v.SongInAlbum,
              song: v,
              diskNumber: v.SongInAlbum.diskNumber ?? undefined,
              trackNumber: v.SongInAlbum.trackNumber ?? undefined,
            })) ?? [],
        });

        toast.success(`Successfully refreshing album #${albumId}.`);
      }
    } catch (e) {
      console.error(`Error occurred refreshing album #${albumId}.`, e);
      toast.error(`Error occurred refreshing album #${albumId}. (${e})`);
    }
  }, [albumId, apolloClient, form]);

  async function onSubmit(values: FormValues) {
    try {
      const data = {
        name: values.name,
        sortOrder: values.sortOrder,
        coverUrl: values.coverUrl,
        songsInAlbum: values.songs.map((v) => ({
          name: v.name,
          diskNumber: v.diskNumber,
          trackNumber: v.trackNumber,
          songId: v.song.id,
        })),
        artistsOfAlbum: values.artists.map((v) => ({
          categories: v.categories,
          roles: v.roles,
          effectiveRoles: v.effectiveRoles,
          artistId: v.artist.id,
        })),
      };

      if (create) {
        const result = await apolloClient.mutate<{
          newAlbum: Partial<Album>;
        }>({
          mutation: NEW_ALBUM_MUTATION,
          variables: { data },
        });

        if (result.data) {
          setAlbum(result.data.newAlbum);
          toast.success(
            `Album "${result.data.newAlbum.name}" is successfully created.`
          );
          handleClose();
        }
      } else {
        const result = await apolloClient.mutate<{
          updateAlbum: Partial<Album>;
        }>({
          mutation: UPDATE_ALBUM_MUTATION,
          variables: { id: albumId, data },
        });

        if (result.data) {
          setAlbum(result.data.updateAlbum);
          toast.success(
            `Album "${result.data.updateAlbum.name}" is successfully updated.`
          );
          apolloClient.cache.evict({ id: `Album:${albumId}` });
          handleClose();
        }
      }
    } catch (e) {
      console.error(
        `Error occurred while ${create ? "creating" : "updating"} album ${
          values?.name
        }.`,
        e
      );
      toast.error(
        `Error occurred while ${create ? "creating" : "updating"} album ${
          values.name
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
                  ? "Create new album entity"
                  : `Edit album entity #${albumId}`}
                {!create && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={refresh}
                        className="absolute top-3 right-12"
                      >
                        <RefreshCw />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh album data</TooltipContent>
                  </Tooltip>
                )}
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
                      <FormLabel>Album name</FormLabel>
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
                            name={`artists.${index}.roles`}
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
                            name={`artists.${index}.effectiveRoles`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Effective roles</FormLabel>
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
                                  placeholder="Select effective roles"
                                  options={rolesChoices}
                                  getOptionValue={(value) => value.value}
                                  getOptionLabel={(value) => value.label}
                                />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`artists.${index}.categories`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categories</FormLabel>
                              <MultiSelect
                                onChange={(selected) => {
                                  field.onChange(
                                    selected ? selected[0].value : "Nothing"
                                  );
                                }}
                                value={[
                                  {
                                    value: field.value,
                                    label:
                                      artistCategoryChoices.find(
                                        (option) => option.value === field.value
                                      )?.label ?? field.value,
                                  },
                                ]}
                                placeholder="Select category"
                                options={artistCategoryChoices}
                                getOptionValue={(value) => value.value}
                                getOptionLabel={(value) => value.label}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                          roles: ["Default"],
                          effectiveRoles: ["Default"],
                          categories: "Nothing",
                        },
                      ]);
                    }}
                  >
                    <Plus />
                    Add artist
                  </Button>
                </div>
              </div>

              {/* Songs Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Tracks</h3>
                <div className="space-y-4">
                  {form.watch("songs")?.map((_, index) => (
                    <Fragment key={index}>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <SelectSongEntityBox
                            form={form}
                            fieldName={`songs.${index}.song`}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            type="button"
                            onClick={() => {
                              const songs = form.getValues("songs");
                              songs.splice(index, 1);
                              form.setValue("songs", songs);
                            }}
                          >
                            <Trash />
                          </Button>
                        </div>

                        <div className="flex gap-4">
                          <FormField
                            control={form.control}
                            name={`songs.${index}.diskNumber`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Disk number</FormLabel>
                                <FormControl>
                                  <div className="flex items-center gap-2">
                                    <Disc3 />
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
                            name={`songs.${index}.trackNumber`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Track number</FormLabel>
                                <FormControl>
                                  <div className="flex items-center gap-2">
                                    <Music />
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

                        <FormField
                          control={form.control}
                          name={`songs.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Track name</FormLabel>
                              <div className="flex items-center gap-2">
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <TrackNameAdornment
                                  form={form}
                                  sourceName="name"
                                  destinationName={`songs.${index}.name`}
                                />
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Separator className="my-4" />
                    </Fragment>
                  ))}

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const songs = form.getValues("songs");
                        form.setValue(
                          "songs",
                          [...songs].sort((a, b) => {
                            if (a.diskNumber === b.diskNumber) {
                              return (
                                (a.trackNumber ?? 0) - (b.trackNumber ?? 0)
                              );
                            }
                            return (a.diskNumber ?? 0) - (b.diskNumber ?? 0);
                          })
                        );
                      }}
                    >
                      Sort by track order
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const songs = form.getValues("songs") || [];
                        form.setValue("songs", [
                          ...songs,
                          {
                            name: "",
                          },
                        ]);
                      }}
                    >
                      <Plus />
                      Add Song
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className="flex-row gap-2 justify-end">
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
