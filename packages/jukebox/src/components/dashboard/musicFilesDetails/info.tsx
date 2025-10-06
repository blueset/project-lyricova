"use client";

import { gql, useApolloClient } from "@apollo/client";
import type { Song as SongModel } from "@lyricova/api/graphql/types";
import type { Album } from "@lyricova/api/graphql/types";
import {
  SelectSongEntityBox,
  TransliterationAdornment,
  AlbumFragments,
} from "@lyricova/components";
import * as z from "zod";
import type { DocumentNode } from "graphql";
import { toast } from "sonner";
import { useNamedState } from "../../../hooks/useNamedState";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@lyricova/components/components/ui/input";
import { Button } from "@lyricova/components/components/ui/button";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import { Separator } from "@lyricova/components/components/ui/separator";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@lyricova/components/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lyricova/components/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "@lyricova/components/components/ui/form";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lyricova/components/components/ui/avatar";
import { Music, Download, X, DiscAlbum } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";

const UPDATE_MUSIC_FILE_INFO_MUTATION = gql`
  mutation ($id: Int!, $data: MusicFileInput!) {
    writeTagsToMusicFile(id: $id, data: $data) {
      trackName
    }
  }
` as DocumentNode;

const IMPORT_ALBUM_MUTATION = gql`
  mutation ($id: Int!) {
    enrolAlbumFromVocaDB(albumId: $id) {
      ...SelectAlbumEntry
    }
  }

  ${AlbumFragments.SelectAlbumEntry}
` as DocumentNode;

const IMPORT_ALBUM_UTAITE_DB_MUTATION = gql`
  mutation ($id: Int!) {
    enrolAlbumFromUtaiteDB(albumId: $id) {
      ...SelectAlbumEntry
    }
  }

  ${AlbumFragments.SelectAlbumEntry}
` as DocumentNode;

type Song = Pick<SongModel, "id" | "name" | "sortOrder"> & {
  albums: Pick<
    SongModel["albums"][number],
    "id" | "utaiteDbId" | "name" | "sortOrder" | "coverUrl"
  >[];
  artists: (Pick<SongModel["artists"][number], "name" | "sortOrder"> & {
    ArtistOfSong: Pick<
      SongModel["artists"][number]["ArtistOfSong"],
      "customName" | "isSupport" | "categories"
    >;
  })[];
};

const formSchema = z
  .object({
    trackName: z.string().optional(),
    trackSortOrder: z.string().optional(),
    artistName: z.string().optional(),
    artistSortOrder: z.string().optional(),
    albumName: z.string().optional(),
    albumSortOrder: z.string().optional(),
    song: z.custom<Song>().optional().nullable(),
    albumId: z.number().int().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.trackName && !data.trackSortOrder) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Track sort order is required when track name is provided",
        path: ["trackSortOrder"],
      });
    }

    if (data.artistName && !data.artistSortOrder) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Artist sort order is required when artist name is provided",
        path: ["artistSortOrder"],
      });
    }

    if (data.albumName && !data.albumSortOrder) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Album sort order is required when album name is provided",
        path: ["albumSortOrder"],
      });
    }
  });

type FormProps = z.infer<typeof formSchema>;

interface Props extends Omit<FormProps, "song" | "albumId"> {
  song?: Partial<Song>;
  albumId?: number;
  path: string;
  fileId: number;
  refresh: () => unknown | Promise<unknown>;
}

export default function InfoPanel({
  trackName,
  trackSortOrder,
  artistName,
  artistSortOrder,
  albumName,
  albumSortOrder,
  song,
  albumId,
  path,
  fileId,
  refresh,
}: Props) {
  const apolloClient = useApolloClient();
  const [isImporting, toggleImporting] = useNamedState(false, "isImporting");

  const form = useForm<FormProps>({
    resolver: zodResolver(formSchema),
    values: {
      trackName,
      trackSortOrder,
      artistName,
      artistSortOrder,
      albumName,
      albumSortOrder,
      song: song as FormProps["song"],
      albumId,
    },
    resetOptions: {
      keepDefaultValues: true,
    },
  });
  const formAlbumId = form.watch("albumId");

  const handleRefreshAlbum = async () => {
    const albumId = form.getValues("albumId");
    if (!albumId) {
      toast.error("Please choose an album to import.");
      return;
    }

    toggleImporting(true);
    try {
      const result = await apolloClient.mutate<{
        enrolAlbumFromVocaDB: Partial<Album>;
      }>({
        mutation: IMPORT_ALBUM_MUTATION,
        variables: {
          id: albumId,
        },
      });

      if (result.data) {
        toast.success(
          `Album “${result.data.enrolAlbumFromVocaDB.name}” is successfully enrolled.`
        );
      }
      toggleImporting(false);
    } catch (e) {
      console.error(`Error occurred while importing album #${albumId}.`, e);
      toast.error(`Error occurred while importing album #${albumId}. (${e})`);
      toggleImporting(false);
    }
  };
  const handleRefreshAlbumUtaiteDb = async () => {
    const albumId = form.getValues("albumId");
    if (!albumId) {
      toast.error("Please choose an album to import.");
      return;
    }
    const utaiteDbId = form
      .getValues("song")
      ?.albums.find((a) => a.id === albumId)?.utaiteDbId;
    if (!utaiteDbId) {
      toast.error("This album does not have UtaiteDB ID.");
      return;
    }

    toggleImporting(true);
    try {
      const result = await apolloClient.mutate<{
        enrolAlbumFromUtaiteDB: Partial<Album>;
      }>({
        mutation: IMPORT_ALBUM_UTAITE_DB_MUTATION,
        variables: {
          id: utaiteDbId,
        },
      });

      if (result.data) {
        toast.success(
          `Album “${result.data.enrolAlbumFromUtaiteDB.name}” is successfully enrolled.`
        );
      }
      toggleImporting(false);
    } catch (e) {
      console.error(
        `Error occurred while importing album #${utaiteDbId} (${albumId}).`,
        e
      );
      toast.error(
        `Error occurred while importing album #${utaiteDbId} (${albumId}). (${e})`
      );
      toggleImporting(false);
    }
  };

  const onSubmit = async (values: FormProps) => {
    try {
      const result = await apolloClient.mutate<{
        writeTagsToMusicFile: { trackName: string };
      }>({
        mutation: UPDATE_MUSIC_FILE_INFO_MUTATION,
        variables: {
          id: fileId,
          data: {
            trackName: values.trackName,
            trackSortOrder: values.trackSortOrder,
            artistName: values.artistName,
            artistSortOrder: values.artistSortOrder,
            albumName: values.albumName,
            albumSortOrder: values.albumSortOrder,
            songId: values.song?.id,
            albumId: values.albumId,
          },
        },
      });
      if (result.data?.writeTagsToMusicFile?.trackName != null) {
        toast.success(`Music file "${path}" is successfully updated.`);
        await refresh();
      }
    } catch (e) {
      console.error(`Error occurred while updating music file ${path}.`, e);
      toast.error(`Error occurred while updating music file ${path}. (${e})`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-6">
          <FormItem>
            <FormLabel>File path</FormLabel>
            <FormControl>
              <Input readOnly disabled value={path} />
            </FormControl>
          </FormItem>

          <div className="grid grid-cols-1 @3xl/dashboard:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="trackName"
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
              name="trackSortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Track sort order</FormLabel>
                  <InputGroup>
                    <FormControl>
                      <InputGroupInput {...field} />
                    </FormControl>
                    <InputGroupAddon align="inline-end">
                      <TransliterationAdornment
                        form={form}
                        sourceName="trackName"
                        destinationName="trackSortOrder"
                      />
                    </InputGroupAddon>
                  </InputGroup>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="artistName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artist name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="artistSortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artist sort order</FormLabel>
                  <InputGroup>
                    <FormControl>
                      <InputGroupInput {...field} />
                    </FormControl>
                    <InputGroupAddon align="inline-end">
                      <TransliterationAdornment
                        form={form}
                        sourceName="artistName"
                        destinationName="artistSortOrder"
                      />
                    </InputGroupAddon>
                  </InputGroup>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="albumName"
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
              name="albumSortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Album sort order</FormLabel>
                  <InputGroup>
                    <FormControl>
                      <InputGroupInput {...field} />
                    </FormControl>
                    <InputGroupAddon align="inline-end">
                      <TransliterationAdornment
                        form={form}
                        sourceName="albumName"
                        destinationName="albumSortOrder"
                      />
                    </InputGroupAddon>
                  </InputGroup>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator className="my-6" />

        <SelectSongEntityBox
          form={form}
          fieldName="song"
          labelName="Linked song"
          title="Link to a song entity"
        />

        {form.watch("song")?.id && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <FormField
                control={form.control}
                name="albumId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Album</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(
                          value === "-"
                            ? null
                            : value
                            ? parseInt(value, 10)
                            : null
                        )
                      }
                      value={field.value?.toString() ?? ""}
                    >
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder="No album"
                              className="w-full"
                            />
                          </SelectTrigger>
                        </FormControl>
                        {form.getValues("albumId") &&
                          form.getValues("albumId") > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <ProgressButton
                                  variant="outline"
                                  size="icon"
                                  progress={isImporting}
                                  className="text-teal-300 dark:border-teal-300 dark:disabled:border-teal-400"
                                  onClick={handleRefreshAlbum}
                                >
                                  <Download />
                                </ProgressButton>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isImporting
                                  ? "Importing..."
                                  : "Import album from VocaDB"}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        {(form
                          .watch("song")
                          ?.albums.find((a) => a.id === form.watch("albumId"))
                          ?.utaiteDbId ?? 0) > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ProgressButton
                                variant="outline"
                                size="icon"
                                progress={isImporting}
                                className="text-pink-300 dark:border-pink-300 dark:disabled:border-pink-400"
                                onClick={handleRefreshAlbumUtaiteDb}
                              >
                                <Download />
                              </ProgressButton>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isImporting
                                ? "Importing..."
                                : "Import album from UtaiteDB"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <SelectContent>
                        <SelectItem value="-">No album</SelectItem>
                        {form.watch("song")?.albums?.map((v) => (
                          <SelectItem
                            key={v.id}
                            value={v.id.toString()}
                            className="flex items-center gap-2"
                          >
                            <Avatar className="h-8 w-8 rounded-sm">
                              <AvatarImage src={v.coverUrl} />
                              <AvatarFallback className="rounded-sm">
                                <Music />
                              </AvatarFallback>
                            </Avatar>
                            {v.name}
                          </SelectItem>
                        ))}
                        {!!field.value?.toString() &&
                          !form
                            .watch("song")
                            ?.albums?.some(
                              (v: { id: number }) => v.id === field.value
                            ) && (
                            <SelectItem
                              value={field.value?.toString() ?? ""}
                              className="text-muted-foreground"
                            >
                              <DiscAlbum />
                              {`Album #${field.value}`}
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const song = form.getValues("song");
                  form.setValue("trackName", song.name);
                  form.setValue("trackSortOrder", song.sortOrder);
                }}
              >
                Update track name
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const song = form.getValues("song");
                  if (song.artists) {
                    let artistName = "",
                      artistSortOrder = "";

                    const producers = song.artists.filter(
                      (v) =>
                        v.ArtistOfSong.categories.indexOf("Producer") >= 0 &&
                        !v.ArtistOfSong.isSupport
                    );
                    artistName += producers
                      .map((v) => v.ArtistOfSong.customName || v.name)
                      .join(", ");
                    artistSortOrder += producers
                      .map((v) => v.ArtistOfSong.customName || v.sortOrder)
                      .join(", ");

                    const vocalists = song.artists.filter(
                      (v) =>
                        v.ArtistOfSong.categories.indexOf("Vocalist") >= 0 &&
                        !v.ArtistOfSong.isSupport
                    );
                    if (vocalists.length > 0) {
                      artistName +=
                        " feat. " +
                        vocalists
                          .map((v) => v.ArtistOfSong.customName || v.name)
                          .join(", ");
                      artistSortOrder +=
                        " feat. " +
                        vocalists
                          .map((v) => v.ArtistOfSong.customName || v.sortOrder)
                          .join(", ");
                    }

                    form.setValue("artistName", artistName);
                    form.setValue("artistSortOrder", artistSortOrder);
                  }
                }}
              >
                Update artist name
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={!formAlbumId}
                onClick={() => {
                  const song = form.getValues("song");
                  const albumId = form.getValues("albumId");
                  const album = song.albums.find((i) => i.id === albumId);
                  form.setValue("albumName", album.name);
                  form.setValue("albumSortOrder", album.sortOrder);
                }}
              >
                Update album name
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4">
          <Button type="submit" variant="outline">
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}
