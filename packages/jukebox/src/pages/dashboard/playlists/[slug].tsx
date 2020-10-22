import { getLayout } from "../../../components/dashboard/layouts/DashboardLayout";
import { useRouter } from "next/router";
import { gql, useApolloClient, useQuery } from "@apollo/client";
import { Alert } from "@material-ui/lab";
import finalFormMutators from "../../../frontendUtils/finalFormMutators";
import PlaylistAvatar from "../../../components/PlaylistAvatar";
import { TextField } from "mui-rff";
import SlugifyAdornment from "../../../components/dashboard/SlugifyAdornment";
import {
  Avatar, Box,
  Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon, ListItemSecondaryAction,
  ListItemText,
  Tooltip
} from "@material-ui/core";
import { Field, Form, FormSpy } from "react-final-form";
import { OnChange } from "react-final-form-listeners";
import slugify from "slugify";
import { useSnackbar } from "notistack";
import { makeStyles } from "@material-ui/core/styles";
import { Playlist } from "../../../models/Playlist";
import { MusicFile } from "../../../models/MusicFile";
import { DragDropContext, Draggable, Droppable, DropResult } from "react-beautiful-dnd";
import { move } from "../../../frontendUtils/arrays";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import DragHandleIcon from "@material-ui/icons/DragHandle";
import DeleteIcon from "@material-ui/icons/Delete";
import GetAppIcon from "@material-ui/icons/GetApp";
import _ from "lodash";
import SelectMusicFileBox from "../../../components/dashboard/selectMusicFileBox";
import { useNamedState } from "../../../frontendUtils/hooks";
import { useCallback } from "react";
import { NextComposedLink } from "../../../components/Link";

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
`;

const UPDATE_PLAYLIST_QUERY = gql`
  mutation($slug: String!, $data: UpdatePlaylistInput!, $files: [Int!]!) {
    updatePlaylist(slug: $slug, data: $data) {
      slug
    }
    updatePlaylistFiles(slug: $slug, fileIds: $files) {
      slug
    }
  }
`;


const REMOVE_PLAYLIST_QUERY = gql`
  mutation($slug: String!) {
    removePlaylist(slug: $slug)
  }
`;

interface FormValues {
  name: string;
  slug: string;
  files: MusicFile[];
  selectedTrack: MusicFile | null;
}

const useStyles = makeStyles((theme) => ({
  form: {
    padding: theme.spacing(2)
  },
  titleRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing(1),
  },
  avatar: {
    marginRight: theme.spacing(1),
    fontSize: "3rem",
    height: "6rem",
    width: "6rem",
  },
  addTrackButton: {
    marginLeft: theme.spacing(1),
  },
  sortButton: {
    marginRight: theme.spacing(1),
  },
  metaButton: {
    marginLeft: theme.spacing(1),
  },
  saveButton: {
    marginTop: theme.spacing(1),
  }
}));

export default function PlaylistDetails() {
  const snackbar = useSnackbar();
  const apolloClient = useApolloClient();
  const styles = useStyles();
  const router = useRouter();
  const slug = router.query.slug as string;

  const [isDeleteAlertOpen, toggleDeleteAlertOpen] = useNamedState(false, "isDeleteAlertOpen");

  const handleDeleteConfirm = useCallback(() => toggleDeleteAlertOpen(true), [toggleDeleteAlertOpen]);
  const handleClose = useCallback(() => toggleDeleteAlertOpen(false), [toggleDeleteAlertOpen]);
  const handleDelete = useCallback(async () => {
    try {
      await apolloClient.mutate({
        mutation: REMOVE_PLAYLIST_QUERY,
        variables: { slug },
      });
      await router.push("/dashboard/playlists");
    } catch (e) {
      console.error("Error occurred while trying to remove the playlist", e);
      snackbar.enqueueSnackbar(`Error occurred while trying to remove the playlist: ${e}`, { variant: "error" });
    }
  }, [apolloClient, router, slug, snackbar]);

  const playlistQuery = useQuery<{ playlist: Playlist }>(PLAYLIST_QUERY, { variables: { slug } });
  if (playlistQuery.error) {
    return <Alert severity="error">Playlist with slug <code>{slug}</code> is not found.</Alert>;
  } else if (!playlistQuery.data) {
    return <Alert severity="info">Loading...</Alert>;
  }

  const { name, files } = playlistQuery.data.playlist;


  return <>
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
              files: values.files?.map(v => v.id) ?? []
            },
          });
          if (values.slug === slug) {
            await playlistQuery.refetch();
          } else {
            await router.push(`/dashboard/playlists/${values.slug}`);
          }
        } catch (e) {
          console.error("Error occurred while creating playlist:", e);
          snackbar.enqueueSnackbar(`Error occurred while creating playlist: ${e}`, { variant: "error" });
        }
      }}
    >{({ submitting, values, handleSubmit }) => <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.titleRow}>
        <PlaylistAvatar name={values.name || ""} slug={values.slug || ""} className={styles.avatar} />
        <div>
          <TextField name="name" label="Name" variant="outlined" margin="dense" size="small" required fullWidth />
          <TextField
            name="slug" label="Slug" variant="outlined" margin="dense" size="small" required fullWidth
            InputProps={{ endAdornment: <SlugifyAdornment sourceName="name" destinationName="slug" /> }}
          />
        </div>
        <Box flexGrow={1} textAlign="end" ml={1}>
          <Button variant="outlined" startIcon={<GetAppIcon />} className={styles.metaButton} component={NextComposedLink} href={`/api/playlists/${slug}.m3u8`}>Export M3U8</Button>
          <Button variant="outlined" startIcon={<DeleteIcon color="error" />} className={styles.metaButton} onClick={handleDeleteConfirm}>Remove playlist</Button>
        </Box>
        {/**
         * Slugify name while slug field is untouched.
         * @link https://codesandbox.io/s/52q597j2p?file=/src/index.js:579-587
         */}
        <Field name="slug">{({ input: { onChange }, meta: { touched } }) =>
          <FormSpy subscription={{ values: true, touched: true }}>{() =>
            <OnChange name="name">{(value) => {
              if (!touched) {
                onChange(slugify(value, { lower: true }));
              }
            }}</OnChange>
          }</FormSpy>
        }</Field>
      </div>
      <Field<MusicFile[]> name="files">{props => {
        const sortBy = (key: keyof MusicFile) => () => {
          props.input.onChange(_.sortBy(props.input.value, key));
        };
        return <DragDropContext onDragEnd={(result: DropResult) => {
          if (!result.destination) return;
          if (result.source.index === result.destination.index) return;
          const
            src = result.source.index,
            dest = result.destination.index;
          props.input.onChange(move(props.input.value, src, dest));
        }}>
          <Button variant="outlined" className={styles.sortButton} onClick={sortBy("trackSortOrder")}>Sort by track
            name</Button>
          <Button variant="outlined" className={styles.sortButton} onClick={sortBy("artistSortOrder")}>Sort by artists
            name</Button>
          <Button variant="outlined" className={styles.sortButton} onClick={sortBy("albumSortOrder")}>Sort by album
            name</Button>
          <Droppable droppableId="playlist-tracks-droppable">{((provided) => (
            <List {...provided.droppableProps} ref={provided.innerRef}>
              {props.input.value.map((v, idx) => (
                <Draggable key={v.id} draggableId={`${v.id}`} index={idx}>{(provided) => (
                  <ListItem button ref={provided.innerRef}
                            ContainerProps={provided.draggableProps} {...provided.dragHandleProps}>
                    <ListItemIcon><DragHandleIcon /></ListItemIcon>
                    <ListItemAvatar><Avatar src={v.hasCover ? `/api/files/${v.id}/cover` : null}
                                            variant="rounded"><MusicNoteIcon /></Avatar></ListItemAvatar>
                    <ListItemText
                      primary={<Tooltip title={v.trackSortOrder || ""}
                                        placement="top"><span>{v.trackName}</span></Tooltip>}
                      secondary={<><Tooltip title={v.artistSortOrder || ""}><span>{v.artistName ||
                      <i>Unknown artist</i>}</span></Tooltip> / <Tooltip
                        title={v.albumSortOrder || ""}><span>{v.albumName || <i>Unknown album</i>}</span></Tooltip></>}
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => {
                        props.input.onChange(props.input.value.filter(i => i.id !== v.id));
                      }}><DeleteIcon color="error" /></IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                )}</Draggable>
              ))}
              {provided.placeholder}
            </List>
          ))}</Droppable>

          <Box display="flex">
            <SelectMusicFileBox fieldName="selectedTrack" labelName="Add track to playlist" />
            <Field<MusicFile | null> name="selectedTrack">{({ input: { value, onChange } }) =>
              <Button variant="outlined" className={styles.addTrackButton}
                      disabled={!value || props.input.value.findIndex(v => value.id === v.id) >= 0} onClick={() => {
                props.input.onChange([...props.input.value, value]);
                onChange(null);
              }}>Add</Button>
            }</Field>
          </Box>

        </DragDropContext>;
      }}</Field>
      <Button variant="outlined" color="secondary" type="submit" disabled={submitting}
              className={styles.saveButton}>Save</Button>
    </form>}</Form>
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
        <Button onClick={handleClose} color="default">
          Cancel
        </Button>
        <Button onClick={handleDelete} color="primary" autoFocus>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  </>;
}

PlaylistDetails.layout = getLayout("Playlist details");
