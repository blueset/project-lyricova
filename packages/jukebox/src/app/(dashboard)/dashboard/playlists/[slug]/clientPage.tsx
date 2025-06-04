"use client";

import { useRouter, useParams } from "next/navigation";
import { gql, useApolloClient, useQuery } from "@apollo/client";
import PlaylistAvatar from "@/components/PlaylistAvatar";
import { NavHeader } from "../../NavHeader";
import { Alert } from "@lyricova/components/components/ui/alert";
import { Button } from "@lyricova/components/components/ui/button";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import { Input } from "@lyricova/components/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogDescription,
} from "@lyricova/components/components/ui/dialog";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@lyricova/components/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lyricova/components/components/ui/form";
import SelectMusicFileBox from "@/components/dashboard/selectMusicFileBox";
import { useNamedState } from "@/hooks/useNamedState";
import { useCallback, useEffect } from "react";
import type { DocumentNode } from "graphql";
import type {
  Playlist,
  MusicFile as MusicFileModel,
} from "@lyricova/api/graphql/types";
import type { DropResult } from "@hello-pangea/dnd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { move } from "@/frontendUtils/arrays";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Music, GripVertical, Trash2, Download, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import * as z from "zod";
import { SlugifyAdornment } from "@lyricova/components";

// GraphQL queries remain unchanged...
const PLAYLIST_QUERY = gql`
  query ($slug: String!) {
    playlist(slug: $slug) {
      name
      slug
      files {
        id
        trackName
        trackSortOrder
        artistName
        artistSortOrder
        albumName
        albumSortOrder
        hasCover
        FileInPlaylist {
          sortOrder
        }
      }
    }
  }
` as DocumentNode;

const UPDATE_PLAYLIST_QUERY = gql`
  mutation ($slug: String!, $data: UpdatePlaylistInput!, $files: [Int!]!) {
    updatePlaylist(slug: $slug, data: $data) {
      slug
    }
    updatePlaylistFiles(slug: $slug, fileIds: $files) {
      slug
    }
  }
` as DocumentNode;

const REMOVE_PLAYLIST_QUERY = gql`
  mutation ($slug: String!) {
    removePlaylist(slug: $slug)
  }
` as DocumentNode;

type MusicFile = Pick<
  MusicFileModel,
  | "id"
  | "trackName"
  | "trackSortOrder"
  | "artistName"
  | "artistSortOrder"
  | "albumName"
  | "albumSortOrder"
  | "hasCover"
>;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  files: z.array(z.custom<MusicFile>()),
  selectedTrack: z.custom<MusicFile | null>().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

function PlaylistForm({ initialData }: { initialData: Playlist }) {
  const apolloClient = useApolloClient();
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const [isDeleteAlertOpen, toggleDeleteAlertOpen] = useNamedState(
    false,
    "isDeleteAlertOpen"
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: {
      name: initialData.name,
      slug: initialData.slug,
      files: initialData.files,
      selectedTrack: null,
    },
    resetOptions: {
      keepDefaultValues: true,
    },
  });

  const { watch, setValue } = form;
  const watchName: string = watch("name");
  const watchSlug: string = watch("slug");
  const watchFiles: MusicFile[] = watch("files");
  const watchSelectedTrack: MusicFile | null = watch("selectedTrack");

  const handleDeleteConfirm = useCallback(
    () => toggleDeleteAlertOpen(true),
    [toggleDeleteAlertOpen]
  );
  const handleClose = useCallback(
    () => toggleDeleteAlertOpen(false),
    [toggleDeleteAlertOpen]
  );

  const handleDelete = useCallback(async () => {
    try {
      await apolloClient.mutate({
        mutation: REMOVE_PLAYLIST_QUERY,
        variables: { slug },
      });
      await router.push("/dashboard/playlists");
    } catch (e) {
      console.error("Error occurred while trying to remove the playlist", e);
      toast.error(`Error occurred while trying to remove the playlist: ${e}`);
    }
  }, [apolloClient, router, slug]);

  const onSubmit = async (values: FormValues) => {
    try {
      await apolloClient.mutate({
        mutation: UPDATE_PLAYLIST_QUERY,
        variables: {
          slug,
          data: { name: values.name, slug: values.slug },
          files: values.files.map((v) => v.id),
        },
      });
      if (values.slug === slug) {
        router.refresh();
      } else {
        await router.push(`/dashboard/playlists/${values.slug}`);
      }
      toast.success("Playlist updated successfully");
    } catch (e) {
      console.error("Error occurred while updating playlist:", e);
      toast.error(`Error occurred while updating playlist: ${e}`);
    }
  };

  const sortFiles = (key: keyof MusicFile) => {
    const sorted = [...watchFiles].sort((a, b) => {
      const aVal = a[key] as string;
      const bVal = b[key] as string;
      return aVal.localeCompare(bVal);
    });
    setValue("files", sorted);
  };

  useEffect(() => {
    if (document?.title) {
      document.title = `Edit ${watchName} – Playlist – Lyricova Jukebox Dashboard`;
    }
  }, [watchName]);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-2 space-y-4">
          <div className="flex flex-col items-center gap-4">
            <PlaylistAvatar
              name={String(watchName || "")}
              slug={String(watchSlug || "")}
              className="h-24 w-24 text-3xl mr-4"
            />
            <div className="w-full max-w-md space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Playlist Name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input {...field} placeholder="playlist-slug" />
                      </FormControl>
                      <SlugifyAdornment
                        form={form}
                        sourceName="name"
                        destinationName="slug"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-between">
            <div className="flex gap-2 items-center">
              Sort by:
              <Button
                type="button"
                variant="outline"
                onClick={() => sortFiles("trackSortOrder")}
              >
                Track name
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => sortFiles("artistSortOrder")}
              >
                Artists name
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => sortFiles("albumSortOrder")}
              >
                Album name
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="gap-2">
                <a href={`/api/playlists/${slug}.m3u8`}>
                  <Download />
                  Export M3U8
                </a>
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                className="gap-2"
                type="button"
              >
                <Trash2 />
                Remove playlist
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="files"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <DragDropContext
                      onDragEnd={(result: DropResult) => {
                        if (!result.destination) return;
                        if (result.source.index === result.destination.index)
                          return;
                        const src = result.source.index;
                        const dest = result.destination.index;
                        field.onChange(move(field.value, src, dest));
                      }}
                    >
                      <Droppable
                        droppableId="playlist-tracks-droppable"
                        isDropDisabled={false}
                        isCombineEnabled={false}
                        ignoreContainerClipping={false}
                      >
                        {(provided) => (
                          <div
                            className="border rounded-md"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                          >
                            <div className="p-2 space-y-2">
                              {field.value.map((v: MusicFile, idx: number) => (
                                <Draggable
                                  key={v.id}
                                  draggableId={`${v.id}`}
                                  index={idx}
                                >
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className="flex items-center gap-2 p-2 border rounded-md bg-background"
                                    >
                                      <div
                                        className="self-stretch place-content-center p-2 -m-2"
                                        {...provided.dragHandleProps}
                                      >
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <Avatar className="rounded-sm">
                                        {v.hasCover ? (
                                          <AvatarImage
                                            src={`/api/files/${v.id}/cover`}
                                            alt="Cover"
                                          />
                                        ) : (
                                          <AvatarFallback className="rounded-sm">
                                            <Music />
                                          </AvatarFallback>
                                        )}
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="truncate font-medium">
                                                {v.trackName}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {v.trackSortOrder || (
                                                <em>No sort order</em>
                                              )}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        <div className="flex gap-1 text-sm text-muted-foreground">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="truncate">
                                                  {v.artistName || (
                                                    <i>Unknown artist</i>
                                                  )}
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {v.artistSortOrder || (
                                                  <em>No sort order</em>
                                                )}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                          <span>/</span>
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="truncate">
                                                  {v.albumName || (
                                                    <i>Unknown album</i>
                                                  )}
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {v.albumSortOrder || (
                                                  <em>No sort order</em>
                                                )}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-destructive-foreground hover:bg-destructive/10"
                                        size="icon"
                                        onClick={() => {
                                          field.onChange(
                                            field.value.filter(
                                              (i: MusicFile) => i.id !== v.id
                                            )
                                          );
                                        }}
                                      >
                                        <X />
                                      </Button>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="selectedTrack"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <SelectMusicFileBox
                          form={form}
                          fieldName="selectedTrack"
                          labelName="Add track to playlist"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={
                  !watchSelectedTrack ||
                  watchFiles.findIndex((v) => watchSelectedTrack.id === v.id) >=
                    0
                }
                onClick={() => {
                  form.setValue("files", [...watchFiles, watchSelectedTrack!]);
                  form.setValue("selectedTrack", null);
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <ProgressButton type="submit" progress={form.formState.isSubmitting}>
            Save
          </ProgressButton>
        </form>
      </Form>

      <Dialog open={isDeleteAlertOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogDescription className="text-center pt-4">
            Are you sure to delete playlist &ldquo;{initialData.name}&rdquo;?
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PlaylistDetails() {
  const { slug } = useParams<{ slug: string }>();
  const playlistQuery = useQuery<{ playlist: Playlist }>(PLAYLIST_QUERY, {
    variables: { slug },
  });

  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Playlists", href: "/dashboard/playlists" },
          {
            label: playlistQuery.data ? playlistQuery.data.playlist.name : slug,
          },
        ]}
      />
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">
        {playlistQuery.error ? (
          <Alert variant="destructive">
            Playlist with slug <code>{slug}</code> is not found.
          </Alert>
        ) : !playlistQuery.data ? (
          <Alert>Loading...</Alert>
        ) : (
          <PlaylistForm initialData={playlistQuery.data.playlist} />
        )}
      </div>
    </>
  );
}
