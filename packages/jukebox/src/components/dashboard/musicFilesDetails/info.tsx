import { makeStyles } from "@material-ui/core/styles";
import { Avatar, Button, Divider, Grid, MenuItem } from "@material-ui/core";
import { useApolloClient } from "@apollo/client";
import { Song } from "../../../models/Song";
import SelectSongEntityBox from "./selectSongEntityBox";
import TransliterationAdornment from "../TransliterationAdornment";
import { Album } from "../../../models/Album";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import { Field, Form } from "react-final-form";
import { makeValidate, Select, TextField } from "mui-rff";
import finalFormMutators from "../../../frontendUtils/finalFormMutators";
import * as yup from "yup";

const useStyles = makeStyles((theme) => ({
  divider: {
    margin: theme.spacing(2, 0),
  },
  formButtons: {
    marginTop: theme.spacing(2),
  },
  listThumbnail: {
    height: "2em",
    width: "2em",
    marginRight: theme.spacing(2),
  },
}));

interface Props {
  trackName: string;
  trackSortOrder: string;
  artistName: string;
  artistSortOrder: string;
  albumName: string;
  albumSortOrder: string;
  fileId: number;
  song?: Partial<Song>;
  album?: Partial<Album>;
}

export default function InfoPanel(
  { trackName, trackSortOrder, artistName, artistSortOrder, albumName, albumSortOrder, song, album, fileId, }: Props
) {
  const styles = useStyles();
  const apolloClient = useApolloClient();

  return (
    <Form
      mutators={{
        ...finalFormMutators,
      }}
      initialValues={{
        trackName, trackSortOrder, artistName, artistSortOrder, albumName, albumSortOrder, song, album,
      }}
      validate={makeValidate(yup.object({
        trackName: yup.string(),
        trackSortOrder: yup.string().when("trackName", {
          is: (v) => !!v,
          then: yup.string().required(),
          otherwise: yup.string().optional()
        }),
        artistName: yup.string(),
        artistSortOrder: yup.string().when("artistName", {
          is: (v) => !!v,
          then: yup.string().required(),
          otherwise: yup.string().optional()
        }),
        albumName: yup.string(),
        albumSortOrder: yup.string().when("albumName", {
          is: (v) => !!v,
          then: yup.string().required(),
          otherwise: yup.string().optional()
        }),
        song: yup.object().nullable(),
        album: yup.number().nullable().integer(),
      }))}
      onSubmit={(values, formApi) => {
        /* TODO */
        console.log("SUBMIT", values);
      }}
      subscription={{
        touched: true,
        pristine: true,
      }}
    >{({ form, submitting, handleSubmit }) => {
      return (
        <>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                variant="outlined"
                margin="dense"
                fullWidth
                name="trackName" type="text" label="Track name" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                variant="outlined"
                margin="dense"
                fullWidth
                name="trackSortOrder" type="text" label="Track sort order"
                InputProps={{
                  endAdornment: <TransliterationAdornment
                    sourceName="trackName"
                    destinationName="trackSortOrder"
                  />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                variant="outlined"
                margin="dense"
                fullWidth
                name="artistName" type="text" label="Artist name" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                variant="outlined"
                margin="dense"
                fullWidth
                name="artistSortOrder" type="text" label="Artist sort order"
                InputProps={{
                  endAdornment: <TransliterationAdornment
                    sourceName="artistName"
                    destinationName="artistSortOrder"
                  />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                variant="outlined"
                margin="dense"
                fullWidth
                name="albumName" type="text" label="Album name" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                variant="outlined"
                margin="dense"
                fullWidth
                name="albumSortOrder" type="text" label="Album sort order"
                InputProps={{
                  endAdornment: <TransliterationAdornment
                    sourceName="albumName"
                    destinationName="albumSortOrder"
                  />,
                }}
              />
            </Grid>
          </Grid>
          <Divider className={styles.divider} />
          <SelectSongEntityBox
            fieldName="song"
            labelName="Linked song"
            title="Link to a song entity"
          />
          <Field<Partial<Song>> name="song" subscription={{ value: true }}>
            {({ input: { value } }) => (
              value && value.id && <Select
                  type="text"
                  label="Album"
                  name="album"
                  formControlProps={{ margin: "dense", variant: "outlined", fullWidth: true }}
                  inputProps={{
                    name: "album",
                    id: "album",
                    renderValue: (v: number) => {
                      const album = value.albums.find(i => i.id === v);
                      if (album) return album.name;
                      return v;
                    }
                  }}
              >
                {[
                  // Workaround for mui-rff.Select to accept an array of elements.
                  <MenuItem value={null} key={null}><em>No album</em></MenuItem>
                ].concat(
                  value.albums?.map((v) => (
                    <MenuItem value={v.id} key={v.id}>
                      <Avatar
                        src={v.coverUrl} variant="rounded"
                        className={styles.listThumbnail}
                      >
                        <MusicNoteIcon />
                      </Avatar>
                      {v.name}
                    </MenuItem>
                  )) ?? []
                )}
              </Select>
            )}
          </Field>
          <div className={styles.formButtons}>
            <Button disabled={submitting} onClick={handleSubmit}>Save</Button>
          </div>
        </>
      );
    }}</Form>
  );
}