import { Album } from "../../../models/Album";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Typography
} from "@material-ui/core";
import { Fragment, useCallback } from "react";
import { gql, useApolloClient } from "@apollo/client";
import TransliterationAdornment from "../TransliterationAdornment";
import { useSnackbar } from "notistack";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import SortIcon from "@material-ui/icons/Sort";
import { makeStyles } from "@material-ui/core/styles";
import SelectSongEntityBox from "./selectSongEntityBox";
import TrackNameAdornment from "../TrackNameAdornment";
import SelectArtistEntityBox from "./selectArtistEntityBox";
import _ from "lodash";
import * as yup from "yup";
import { AlbumFragments } from "../../../graphql/fragments";
import VideoThumbnailAdornment from "../VideoThumbnailAdornment";
import { Artist } from "../../../models/Artist";
import { Field, Form } from "react-final-form";
import { makeValidate, Select, TextField } from "mui-rff";
import finalFormMutators from "../../../frontendUtils/finalFormMutators";
import arrayMutators from "final-form-arrays";
import { FieldArray } from "react-final-form-arrays";
import AvatarField from "./AvatarField";
import { Song } from "../../../models/Song";
import { VDBArtistCategoryType, VDBArtistRoleType } from "../../../types/vocadb";

const NEW_ALBUM_MUTATION = gql`
  mutation($data: AlbumInput!) {
    newAlbum(data: $data) {
      ...SelectAlbumEntry
    }
  }
  
  ${AlbumFragments.SelectAlbumEntry}
`;

interface RoleFieldProps {
  name: string;
  label: string;
}

function RoleField<T extends string>({ name, label }: RoleFieldProps) {
  return (
    <Select
      type="text"
      label={label}
      name={name}
      multiple
      inputProps={{ name: name, id: name }}
    >
      <MenuItem value="Default">Default</MenuItem>
      <MenuItem value="Animator">Animator</MenuItem>
      <MenuItem value="Arranger">Arranger</MenuItem>
      <MenuItem value="Composer">Composer</MenuItem>
      <MenuItem value="Distributor">Distributor</MenuItem>
      <MenuItem value="Illustrator">Illustrator</MenuItem>
      <MenuItem value="Instrumentalist">Instrumentalist</MenuItem>
      <MenuItem value="Lyricist">Lyricist</MenuItem>
      <MenuItem value="Mastering">Mastering</MenuItem>
      <MenuItem value="Publisher">Publisher</MenuItem>
      <MenuItem value="Vocalist">Vocalist</MenuItem>
      <MenuItem value="VoiceManipulator">Voice Manipulator</MenuItem>
      <MenuItem value="Other">Other</MenuItem>
      <MenuItem value="Mixer">Mixer</MenuItem>
      <MenuItem value="Chorus">Chorus</MenuItem>
      <MenuItem value="Encoder">Encoder</MenuItem>
      <MenuItem value="VocalDataProvider">Vocal Data Provider</MenuItem>
    </Select>
  );
}


const useStyles = makeStyles((theme) => ({
  artistRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    "& > *": {
      marginRight: theme.spacing(1),
    },
    "& > *:last-child": {
      marginRight: 0,
    },
  },
  mainPictureRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  mainPictureThumbnail: {
    marginRight: theme.spacing(2),
    height: "3em",
    width: "3em",
  },
  numberField: {
    width: "10em",
    "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
      "-webkit-appearance": "none",
      margin: 0,
    },
    "input[type=number]": {
      "-moz-appearance": "textfield",
    },
  },
  divider: {
    margin: theme.spacing(1, 0),
  }
}));

interface FormValues {
  name: string;
  sortOrder: string;
  coverUrl: string;
  originalSong?: Song;
  artists: {
    artist: Partial<Artist>;
    roles: VDBArtistRoleType[];
    effectiveRoles: VDBArtistRoleType[];
    categories: VDBArtistCategoryType;
  }[];
  songs: {
    song: Partial<Song>;
    trackNumber?: number;
    diskNumber?: number;
    name: string;
  }[];
}

interface Props {
  isOpen: boolean;
  create?: boolean;
  toggleOpen: (value: boolean) => void;
  keyword: string;
  setKeyword: (value: string) => void;
  setAlbum: (value: Partial<Album>) => void;
  albumToEdit?: Partial<Album>;
}

export default function CreateAlbumEntityDialog({ isOpen, toggleOpen, keyword, setKeyword, setAlbum }: Props) {

  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();
  const styles = useStyles();

  const handleClose = useCallback(() => {
    toggleOpen(false);
    setKeyword("");
  }, [toggleOpen, setKeyword]);

  return (
    <Dialog open={isOpen} onClose={handleClose} aria-labelledby="form-dialog-title" scroll="paper">
      <Form<FormValues>
        initialValues={{
          name: keyword,
          sortOrder: "",
          coverUrl: "",
          songs: [],
          artists: [],
        }}
        mutators={{
          ...finalFormMutators,
          ...arrayMutators,
        }}
        subscription={{}}
        validate={makeValidate<FormValues>(yup.object({
          name: yup.string().required(),
          sortOrder: yup.string().required(),
          coverUrl: yup.string().url(),
          songs: yup.array().of(yup.object({
            song: yup.object().typeError("Song entity must be selected."),
            diskNumber: yup.number().optional().nullable().positive().integer(),
            trackNumber: yup.number().optional().nullable().positive().integer(),
            name: yup.string().required(),
          })),
          artists: yup.array().of(yup.object({
            artist: yup.object().typeError("Artist entity must be selected."),
            categories: yup.string<VDBArtistCategoryType>().required(),
            roles: yup.array(yup.string<VDBArtistRoleType>().required()).required(),
            effectiveRoles: yup.array(yup.string<VDBArtistRoleType>().required()).required(),
          }))
        }))}
        onSubmit={async (values) => {
          try {
            const result = await apolloClient.mutate<{ newAlbum: Partial<Album> }>({
              mutation: NEW_ALBUM_MUTATION,
              variables: {
                data: {
                  name: values.name,
                  sortOrder: values.sortOrder,
                  coverUrl: values.coverUrl,
                  songsInAlbum: values.songs.map(v => ({
                    name: v.name,
                    diskNumber: v.diskNumber,
                    trackNumber: v.trackNumber,
                    songId: v.song.id,
                  })),
                  artistsOfAlbum: values.artists.map(v => ({
                    categories: v.categories,
                    roles: v.roles,
                    effectiveRoles: v.effectiveRoles,
                    artistId: v.artist.id,
                  })),
                }
              }
            });

            if (result.data) {
              setAlbum(result.data.newAlbum);
              snackbar.enqueueSnackbar(`Album “${result.data.newAlbum.name}” is successfully created.`, {
                variant: "success",
              });
              handleClose();
            }
          } catch (e) {
            console.error(`Error occurred while creating artist #${values.name}.`, e);
            snackbar.enqueueSnackbar(`Error occurred while creating album ${values.name}. (${e})`, {
              variant: "error",
            });
          }
        }}>
        {({ form, submitting, handleSubmit }) => (
          <>
            <DialogTitle id="form-dialog-title">Create new album entity</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <TextField
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    required
                    name="name" type="text" label="Album name" />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    required
                    InputProps={{
                      endAdornment: <TransliterationAdornment
                        sourceName="name"
                        destinationName="sortOrder"
                      />,
                    }}
                    name="sortOrder" type="text" label="Sort order" />
                </Grid>
                <Grid item xs={12}>
                  <div className={styles.mainPictureRow}>
                    <AvatarField
                      name="coverUrl"
                      className={styles.mainPictureThumbnail}
                    />
                    <TextField
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      InputProps={{
                        endAdornment: <VideoThumbnailAdornment name="coverUrl" />,
                      }}
                      name="coverUrl" type="text" label="Cover URL" />
                  </div>
                </Grid>
              </Grid>
              <Typography variant="h6" component="h3" className={styles.divider}>Artists</Typography>
              <FieldArray name="artists" subscription={{ error: true }}>
                {({ fields }) => (
                  <>
                    {fields.map((name, idx) => (
                      <Fragment key={name}>
                        <SelectArtistEntityBox
                          fieldName={`${name}.artist`}
                          labelName="Artist"
                        />
                        <div className={styles.artistRow}>
                          <RoleField name={`${name}.roles`} label="Roles" />
                          <RoleField name={`${name}.effectiveRoles`} label="Effective roles" />
                        </div>
                        <div className={styles.artistRow}>
                          <TextField
                            type="text"
                            label="Category"
                            name={`${name}.categories`}
                            variant="outlined"
                            margin="dense"
                            select
                            fullWidth
                            inputProps={{ name: `${name}.categories`, id: `${name}.categories` }}
                          >
                            <MenuItem value="Nothing">Nothing</MenuItem>
                            <MenuItem value="Vocalist">Vocalist</MenuItem>
                            <MenuItem value="Producer">Producer</MenuItem>
                            <MenuItem value="Animator">Animator</MenuItem>
                            <MenuItem value="Label">Label</MenuItem>
                            <MenuItem value="Circle">Circle</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                            <MenuItem value="Band">Band</MenuItem>
                            <MenuItem value="Illustrator">Illustrator</MenuItem>
                            <MenuItem value="Subject">Subject</MenuItem>
                          </TextField>
                          <IconButton color="primary" aria-label="Delete artist item"
                                      onClick={() => fields.remove(idx)}>
                            <DeleteIcon />
                          </IconButton>
                        </div>
                        <Divider className={styles.divider} />
                      </Fragment>
                    ))}
                    <Button
                      fullWidth variant="outlined"
                      color="secondary"
                      startIcon={<AddIcon />}
                      onClick={() => fields.push({
                        artist: null,
                        roles: ["Default"],
                        effectiveRoles: ["Default"],
                        categories: "Nothing",
                      })}
                    >
                      Add artist
                    </Button>
                  </>
                )}
              </FieldArray>
              <Typography variant="h6" component="h3" className={styles.divider}>Tracks</Typography>
              <FieldArray name="songs" subscription={{}}>
                {({ fields }) => (
                  <>
                    {fields.map((v, idx) => (
                      <>
                        <SelectSongEntityBox
                          fieldName={`songs.${idx}.song`}
                          labelName="Track"
                        />
                        <div className={styles.artistRow}>
                          <TextField
                            className={styles.numberField}
                            variant="outlined"
                            margin="dense"
                            name={`songs.${idx}.diskNumber`} type="number" label="#Disk" />
                          <TextField
                            className={styles.numberField}
                            variant="outlined"
                            margin="dense"
                            name={`songs.${idx}.trackNumber`} type="number" label="#Track" />
                          <TextField
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            required
                            name={`songs.${idx}.name`} type="text" label="Track name"
                            InputProps={{
                              endAdornment: <TrackNameAdornment
                                sourceName="name"
                                destinationName={`${name}.name`}
                              />,
                            }}
                          />
                          <IconButton color="primary" aria-label="Delete album item" onClick={() => fields.remove(idx)}>
                            <DeleteIcon />
                          </IconButton>
                        </div>
                        <Divider className={styles.divider} />
                      </>
                    ))}
                    <div className={styles.artistRow}>
                      <Field name="songs">{({input: {value}}) => (
                        <Button
                          variant="outlined"
                          color="default"
                          startIcon={<SortIcon />}
                          onClick={() => form.mutators.setValue(
                            "songs",
                            _.sortBy(value, ["diskNumber", "trackNumber"])
                          )}
                        >
                          Sort
                        </Button>
                      )}</Field>
                      <Button
                        fullWidth variant="outlined"
                        color="secondary"
                        startIcon={<AddIcon />}
                        onClick={() => fields.push({
                          song: null,
                          trackNumber: null,
                          diskNumber: null,
                          name: "",
                        })}
                      >
                        Add Album
                      </Button>
                    </div>
                  </>
                )}
              </FieldArray>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button disabled={submitting} onClick={handleSubmit} color="primary">
                Create
              </Button>
            </DialogActions>
          </>
        )}
      </Form>
    </Dialog>
  );
}
