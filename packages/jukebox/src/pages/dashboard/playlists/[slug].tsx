import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";
import { useRouter } from "next/router";
import { gql, useApolloClient, useQuery } from "@apollo/client";
import Alert from "@mui/material/Alert";
import finalFormMutators from "../../../frontendUtils/finalFormMutators";
import PlaylistAvatar from "../../../components/PlaylistAvatar";
import { TextField } from "mui-rff";
import SlugifyAdornment from "../../../components/dashboard/SlugifyAdornment";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  styled,
  Tooltip,
} from "@mui/material";
import { Field, Form, FormSpy } from "react-final-form";
import { OnChange } from "react-final-form-listeners";
import slugify from "slugify";
import { useSnackbar } from "notistack";
import { Playlist } from "lyricova-common/models/Playlist";
import { MusicFile } from "lyricova-common/models/MusicFile";
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "react-beautiful-dnd";
import { move } from "../../../frontendUtils/arrays";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import DeleteIcon from "@mui/icons-material/Delete";
import GetAppIcon from "@mui/icons-material/GetApp";
import _ from "lodash";
import SelectMusicFileBox from "../../../components/dashboard/selectMusicFileBox";
import { useNamedState } from "../../../frontendUtils/hooks";
import { useCallback } from "react";
import { NextComposedLink } from "../../../components/Link";
import { DocumentNode } from "graphql";

const PLAYLIST_QUERY = gql`
  query($slug: String!) {
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
  mutation($slug: String!, $data: UpdatePlaylistInput!, $files: [Int!]!) {
    updatePlaylist(slug: $slug, data: $data) {
      slug
    }
    updatePlaylistFiles(slug: $slug, fileIds: $files) {
      slug
    }
  }
` as DocumentNode;

const REMOVE_PLAYLIST_QUERY = gql`
  mutation($slug: String!) {
    removePlaylist(slug: $slug)
  }
` as DocumentNode;

interface FormValues {
  name: string;
  slug: string;
  files: MusicFile[];
  selectedTrack: MusicFile | null;
}

const RightStackButton = styled(Button)({ marginLeft: 4 });
const LeftStackButton = styled(Button)({ marginRight: 4 });

export default function PlaylistDetails() {
  const snackbar = useSnackbar();
  const apolloClient = useApolloClient();
  const router = useRouter();
  const slug = router.query.slug as string;

  const [isDeleteAlertOpen, toggleDeleteAlertOpen] = useNamedState(
    false,
    "isDeleteAlertOpen"
  );

  const handleDeleteConfirm = useCallback(() => toggleDeleteAlertOpen(true), [
    toggleDeleteAlertOpen,
  ]);
  const handleClose = useCallback(() => toggleDeleteAlertOpen(false), [
    toggleDeleteAlertOpen,
  ]);
  const handleDelete = useCallback(async () => {
    try {
      await apolloClient.mutate({
        mutation: REMOVE_PLAYLIST_QUERY,
        variables: { slug },
      });
      await router.push("/dashboard/playlists");
    } catch (e) {
      console.error("Error occurred while trying to remove the playlist", e);
      snackbar.enqueueSnackbar(
        `Error occurred while trying to remove the playlist: ${e}`,
        { variant: "error" }
      );
    }
  }, [apolloClient, router, slug, snackbar]);

  const playlistQuery = useQuery<{ playlist: Playlist }>(PLAYLIST_QUERY, {
    variables: { slug },
  });
  if (playlistQuery.error) {
    return (
      <Alert severity="error">
        Playlist with slug <code>{slug}</code> is not found.
      </Alert>
    );
  } else if (!playlistQuery.data) {
    return <Alert severity="info">Loading...</Alert>;
  }

  const { name, files } = playlistQuery.data.playlist;

  return (
    <>
      <Form<FormValues>
        initialValues={{ name, slug, files }}
        mutators={{ ...finalFormMutators }}
        onSubmit={async (values) => {
          try {
            await apolloClient.mutate({
              mutation: UPDATE_PLAYLIST_QUERY,
              variables: {
                slug,
                data: { name: values.name, slug: values.slug },
                files: values.files?.map((v) => v.id) ?? [],
              },
            });
            if (values.slug === slug) {
              await playlistQuery.refetch();
            } else {
              await router.push(`/dashboard/playlists/${values.slug}`);
            }
          } catch (e) {
            console.error("Error occurred while creating playlist:", e);
            snackbar.enqueueSnackbar(
              `Error occurred while creating playlist: ${e}`,
              { variant: "error" }
            );
          }
        }}
      >
        {({ submitting, values, handleSubmit }) => (
          <form onSubmit={handleSubmit} style={{ padding: 8 }}>
            <Stack alignItems="center" sx={{ marginBottom: 1 }}>
              <PlaylistAvatar
                name={values.name || ""}
                slug={values.slug || ""}
                sx={{
                  marginRight: 1,
                  fontSize: "3rem",
                  height: "6rem",
                  width: "6rem",
                }}
              />
              <div>
                <TextField
                  name="name"
                  label="Name"
                  variant="outlined"
                  margin="dense"
                  size="small"
                  required
                  fullWidth
                />
                <TextField
                  name="slug"
                  label="Slug"
                  variant="outlined"
                  margin="dense"
                  size="small"
                  required
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <SlugifyAdornment
                        sourceName="name"
                        destinationName="slug"
                      />
                    ),
                  }}
                />
              </div>
              <Box flexGrow={1} textAlign="end" ml={1}>
                <Button
                  variant="outlined"
                  sx={{ marginLeft: 1 }}
                  startIcon={<GetAppIcon />}
                  component={NextComposedLink}
                  href={`/api/playlists/${slug}.m3u8`}
                >
                  Export M3U8
                </Button>
                <Button
                  variant="outlined"
                  sx={{ marginLeft: 1 }}
                  startIcon={<DeleteIcon color="error" />}
                  onClick={handleDeleteConfirm}
                >
                  Remove playlist
                </Button>
              </Box>
              {/**
               * Slugify name while slug field is untouched.
               * @link https://codesandbox.io/s/52q597j2p?file=/src/index.js:579-587
               */}
              <Field name="slug">
                {({ input: { onChange }, meta: { touched } }) => (
                  <FormSpy subscription={{ values: true, touched: true }}>
                    {() => (
                      <OnChange name="name">
                        {(value) => {
                          if (!touched) {
                            onChange(slugify(value, { lower: true }));
                          }
                        }}
                      </OnChange>
                    )}
                  </FormSpy>
                )}
              </Field>
            </Stack>
            <Field<MusicFile[]> name="files">
              {(props) => {
                const sortBy = (key: keyof MusicFile) => () => {
                  props.input.onChange(_.sortBy(props.input.value, key));
                };
                return (
                  <DragDropContext
                    onDragEnd={(result: DropResult) => {
                      if (!result.destination) return;
                      if (result.source.index === result.destination.index)
                        return;
                      const src = result.source.index,
                        dest = result.destination.index;
                      props.input.onChange(move(props.input.value, src, dest));
                    }}
                  >
                    <LeftStackButton
                      variant="outlined"
                      onClick={sortBy("trackSortOrder")}
                    >
                      Sort by track name
                    </LeftStackButton>
                    <LeftStackButton
                      variant="outlined"
                      onClick={sortBy("artistSortOrder")}
                    >
                      Sort by artists name
                    </LeftStackButton>
                    <LeftStackButton
                      variant="outlined"
                      onClick={sortBy("albumSortOrder")}
                    >
                      Sort by album name
                    </LeftStackButton>
                    <Droppable droppableId="playlist-tracks-droppable">
                      {(provided) => (
                        <List
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                        >
                          {props.input.value.map((v, idx) => (
                            <Draggable
                              key={v.id}
                              draggableId={`${v.id}`}
                              index={idx}
                            >
                              {(provided) => (
                                <ListItem
                                  button
                                  ref={provided.innerRef}
                                  ContainerProps={provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <ListItemIcon>
                                    <DragHandleIcon />
                                  </ListItemIcon>
                                  <ListItemAvatar>
                                    <Avatar
                                      src={
                                        v.hasCover
                                          ? `/api/files/${v.id}/cover`
                                          : null
                                      }
                                      variant="rounded"
                                    >
                                      <MusicNoteIcon />
                                    </Avatar>
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={
                                      <Tooltip
                                        title={v.trackSortOrder || ""}
                                        placement="top"
                                      >
                                        <span>{v.trackName}</span>
                                      </Tooltip>
                                    }
                                    secondary={
                                      <>
                                        <Tooltip
                                          title={v.artistSortOrder || ""}
                                        >
                                          <span>
                                            {v.artistName || (
                                              <i>Unknown artist</i>
                                            )}
                                          </span>
                                        </Tooltip>{" "}
                                        /{" "}
                                        <Tooltip title={v.albumSortOrder || ""}>
                                          <span>
                                            {v.albumName || (
                                              <i>Unknown album</i>
                                            )}
                                          </span>
                                        </Tooltip>
                                      </>
                                    }
                                  />
                                  <ListItemSecondaryAction>
                                    <IconButton
                                      onClick={() => {
                                        props.input.onChange(
                                          props.input.value.filter(
                                            (i) => i.id !== v.id
                                          )
                                        );
                                      }}
                                    >
                                      <DeleteIcon color="error" />
                                    </IconButton>
                                  </ListItemSecondaryAction>
                                </ListItem>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </List>
                      )}
                    </Droppable>

                    <Box display="flex">
                      <SelectMusicFileBox
                        fieldName="selectedTrack"
                        labelName="Add track to playlist"
                      />
                      <Field<MusicFile | null> name="selectedTrack">
                        {({ input: { value, onChange } }) => (
                          <RightStackButton
                            variant="outlined"
                            disabled={
                              !value ||
                              props.input.value.findIndex(
                                (v) => value.id === v.id
                              ) >= 0
                            }
                            onClick={() => {
                              props.input.onChange([
                                ...props.input.value,
                                value,
                              ]);
                              onChange(null);
                            }}
                          >
                            Add
                          </RightStackButton>
                        )}
                      </Field>
                    </Box>
                  </DragDropContext>
                );
              }}
            </Field>
            <Button
              variant="outlined"
              color="secondary"
              type="submit"
              disabled={submitting}
              sx={{ marginTop: 1 }}
            >
              Save
            </Button>
          </form>
        )}
      </Form>
      <Dialog
        open={isDeleteAlertOpen}
        onClose={handleClose}
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure to delete playlist “{name}”?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleDelete} color="primary" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

PlaylistDetails.layout = getLayout("Playlist details");
