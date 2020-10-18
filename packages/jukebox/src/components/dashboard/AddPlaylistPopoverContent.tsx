import { makeStyles } from "@material-ui/core/styles";
import { Field, Form, FormSpy } from "react-final-form";
import PlaylistAvatar from "../PlaylistAvatar";
import { TextField } from "mui-rff";
import { IconButton } from "@material-ui/core";
import CheckIcon from "@material-ui/icons/Check";
import CloseIcon from "@material-ui/icons/Close";
import { OnChange } from "react-final-form-listeners";
import slugify from "slugify";
import finalFormMutators from "../../frontendUtils/finalFormMutators";
import SlugifyAdornment from "./SlugifyAdornment";
import { gql, useApolloClient } from "@apollo/client";
import { useSnackbar } from "notistack";

const NEW_PLAYLIST_MUTATION = gql`
  mutation ($name: String!, $slug: String!) {
    newPlaylist(data: {name: $name, slug: $slug}) {
      name
      slug
    }
  }
`;

interface FormValues {
  name: string;
  slug: string;
}

interface Props {
  refresh: () => void;
  dismiss: () => void;
}

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    margin: theme.spacing(0, 1),
    fontSize: "2rem",
    height: "5rem",
    width: "5rem",
  }
}));

export default function AddPlaylistPopoverContent({ refresh, dismiss }: Props) {
  const styles = useStyles();
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  return (
    <Form<FormValues>
      initialValues={{ name: "", slug: "" }}
      mutators={{ ...finalFormMutators }}
      onSubmit={async (values) => {
        try {
          await apolloClient.mutate({
            mutation: NEW_PLAYLIST_MUTATION,
            variables: values
          });
          refresh();
          dismiss();
        } catch (e) {
          console.error("Error occurred while creating playlist:", e);
          snackbar.enqueueSnackbar(`Error occurred while creating playlist: ${e}`, {variant: "error"});
        }
      }}
    >{({ submitting, values, handleSubmit }) => <form className={styles.container} onSubmit={handleSubmit}>
      <PlaylistAvatar name={values.name || ""} slug={values.slug || ""} className={styles.avatar} />
      <div>
        <TextField name="name" label="Name" variant="outlined" margin="dense" size="small" required />
        <TextField
          name="slug" label="Slug" variant="outlined" margin="dense" size="small" required
          InputProps={{ endAdornment: <SlugifyAdornment sourceName="name" destinationName="slug" /> }}
        />
      </div>
      <div>
        <IconButton type="submit" disabled={submitting}><CheckIcon /></IconButton>
        <IconButton onClick={dismiss}><CloseIcon /></IconButton>
      </div>
      {/**
       * Slugify name while slug field is untouched.
       * @link https://codesandbox.io/s/52q597j2p?file=/src/index.js:579-587
       */}
      <Field name="slug">{({ input: { onChange }, meta: { touched } }) =>
        <FormSpy subscription={{ values: true, touched: true }}>{() =>
          <OnChange name="name">{(value) => {
            if (!touched) {
              onChange(slugify(value, {lower: true}));
            }
          }}</OnChange>
        }</FormSpy>
      }</Field>
    </form>}</Form>
  );
}