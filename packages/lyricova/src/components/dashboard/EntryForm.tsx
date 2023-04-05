import type { Entry } from "lyricova-common/models/Entry";
import type { Song } from "lyricova-common/models/Song";
import type { Verse } from "lyricova-common/models/Verse";
import type { Tag } from "lyricova-common/models/Tag";
import type { Pulse } from "lyricova-common/models/Pulse";
import { gql, useQuery, useApolloClient } from "@apollo/client";
import { useSnackbar } from "notistack";
import * as yup from "yup";
import { makeValidate, Select, showErrorOnChange, TextField } from "mui-rff";
import { Field, Form, FormSpy, useField } from "react-final-form";
import { FieldArray } from "react-final-form-arrays";
import finalFormMutators from "lyricova-common/frontendUtils/finalFormMutators";
import arrayMutators from "final-form-arrays";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  ButtonGroup,
  FormHelperText,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  TextField as MuiTextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import { Box } from "@mui/system";
import SelectSongEntityBox from "lyricova-common/components/selectSongEntityBox";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers";
import { DateTimePickerPopup } from "./DateTimePickerPopup";
import { useRouter } from "next/router";
import { SongFragments } from "lyricova-common/utils/fragments";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const monospacedFont =
  '"Rec Mono Casual", "Cascadia Code", "Fira Code", monospace';

const ENTRY_FRAGMENT = gql`
  fragment EntryFragment on Entry {
    id
    title
    producersName
    vocalistsName
    comment
    songs {
      ...SelectSongEntry
    }
    verses {
      id
      text
      isMain
      isOriginal
      translator
      language
      stylizedText
      html
      typingSequence
    }
    tags {
      name
      slug
      color
    }
    creationDate
    pulses {
      id
      creationDate
    }
  }

  ${SongFragments.SelectSongEntry}
`;

const ENTRY_QUERY = gql`
  query Entry($id: Int!, $hasEntry: Boolean!) {
    entry(id: $id) @include(if: $hasEntry) {
      ...EntryFragment
    }
    tags {
      color
      name
      slug
    }
  }

  ${ENTRY_FRAGMENT}
`;

const NEW_ENTRY_MUTATION = gql`
  mutation NewEntry($data: EntryInput!) {
    newEntry(data: $data) {
      ...EntryFragment
    }
  }

  ${ENTRY_FRAGMENT}
`;

const UPDATE_ENTRY_MUTATION = gql`
  mutation UpdateEntry($id: Int!, $data: EntryInput!) {
    updateEntry(data: $data, id: $id) {
      ...EntryFragment
    }
  }

  ${ENTRY_FRAGMENT}
`;

const TRANSLITRATION_QUERY = gql`
  query ($text: String!, $language: String) {
    transliterate(text: $text) {
      typing(language: $language)
    }
  }
`;

interface FormValues {
  title: string;
  producersName: string;
  vocalistsName: string;
  comment: string | null;
  songs: Partial<Song>[];
  verses: Partial<
    Omit<Verse, "typingSequence"> & {
      typingSequence?: string;
    }
  >[];
  tags: string[];
  pulses: Partial<Pulse>[];
  creationDate: number;
}

const initialFormValues = (data: { entry?: Entry }): FormValues => ({
  ...data.entry,
  creationDate: data.entry.creationDate as unknown as number,
  tags: data.entry.tags.map((tag) => tag.slug),
  verses: data.entry.verses.map((verse) => ({
    ...verse,
    typingSequence: JSON.stringify(verse.typingSequence),
  })),
});

interface EntityFormProps {
  id?: number;
}

export function EntryForm({ id }: EntityFormProps) {
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();
  const router = useRouter();

  const { data, loading, refetch } = useQuery<{
    entry?: Entry;
    tags: Tag[];
  }>(ENTRY_QUERY, {
    variables: { id: id || -1, hasEntry: !!id },
  });

  if (loading || (id && !data?.entry) || !data?.tags) {
    return <Alert severity="info">Loading...</Alert>;
  }

  const initialValues: FormValues = !id
    ? {
        title: "",
        producersName: "",
        vocalistsName: "",
        comment: null,
        songs: [],
        verses: [],
        tags: [],
        pulses: [],
        creationDate: Date.now().valueOf(),
      }
    : initialFormValues(data);

  const schema = yup.object({
    title: yup.string().required(),
    producersName: yup.string(),
    vocalistsName: yup.string(),
    comment: yup.string().nullable(),
    songs: yup.array(yup.object().typeError("Song entity must be selected")),
    verses: yup
      .array(
        yup.object({
          text: yup.string().required(),
          translator: yup.string().nullable(),
          language: yup.string().required(),
          isMain: yup.boolean(),
          isOriginal: yup.boolean(),
          stylizedText: yup.string().nullable(),
          html: yup.string().nullable(),
          typingSequence: yup.string(),
        })
      )
      .test(
        "onlyOneMain",
        { isMain: "Only one main verse is allowed." },
        (list) => list.filter((item) => item["isMain"]).length === 1
      )
      .test(
        "onlyOneOriginal",
        { isOriginal: "Only one original verse is allowed." },
        (list) => list.filter((item) => item["isOriginal"]).length === 1
      ),
    tags: yup.array(yup.string()),
    pulses: yup.array(yup.object().typeError("Pulse entity must be selected")),
    creationDate: yup.number().required(),
  });

  const validate = makeValidate<FormValues>(schema);

  return (
    <>
      <Form<FormValues>
        initialValues={initialValues}
        mutators={{
          ...finalFormMutators,
          ...arrayMutators,
        }}
        subscription={{}}
        validate={validate}
        onSubmit={async (values, formApi) => {
          try {
            const data = {
              title: values.title,
              producersName: values.producersName,
              vocalistsName: values.vocalistsName,
              creationDate: values.creationDate || Date.now().valueOf(),
              comment: values.comment || null,
              tagSlugs: values.tags,
              verses: values.verses.map((verse) => ({
                id: verse.id || undefined,
                language: verse.language,
                text: verse.text,
                isOriginal: verse.isOriginal,
                isMain: verse.isMain,
                stylizedText: verse.stylizedText || null,
                html: verse.html || null,
                typingSequence: JSON.parse(verse.typingSequence || "[]"),
                translator: verse.translator || null,
              })),
              songIds: values.songs.map((song) => song.id),
              pulses: values.pulses.map((pulse) => ({
                id: pulse.id || undefined,
                creationDate: pulse.creationDate || Date.now().valueOf(),
              })),
            };

            if (!id) {
              // create
              const result = await apolloClient.mutate<{
                newEntry: Partial<Entry>;
              }>({
                mutation: NEW_ENTRY_MUTATION,
                variables: { data },
              });
              if (result.data) {
                snackbar.enqueueSnackbar(
                  `Entry ${result.data.newEntry.title} is successfully created.`,
                  {
                    variant: "success",
                  }
                );
                router.push(`/dashboard/entries/${result.data.newEntry.id}`);
              }
            } else {
              // update
              const result = await apolloClient.mutate<{
                updateEntry: Partial<Entry>;
              }>({
                mutation: UPDATE_ENTRY_MUTATION,
                variables: { id, data },
              });
              if (result.data) {
                snackbar.enqueueSnackbar(
                  `Entry ${result.data.updateEntry.title} is successfully updated.`,
                  {
                    variant: "success",
                  }
                );
                const outcome = await refetch();
                formApi.reset(initialFormValues(outcome.data));
              }
            }
          } catch (e) {
            console.error(
              `Error occurred while ${!id ? "creating" : "updating"} entry ${
                values?.title
              }.`,
              e
            );
            snackbar.enqueueSnackbar(
              `Error occurred while ${!id ? "creating" : "updating"} Entry ${
                values?.title
              }. (${e})`,
              {
                variant: "error",
              }
            );
          }
        }}
      >
        {({ values, submitting, handleSubmit, form, errors }) => {
          return (
            <form onSubmit={handleSubmit}>
              <TextField
                variant="outlined"
                margin="dense"
                fullWidth
                required
                name="title"
                label="Title"
                type="text"
              />
              <Stack direction="row" spacing={2} alignItems="center" my={1}>
                <TextField
                  variant="outlined"
                  fullWidth
                  name="producersName"
                  label="Producers Name"
                  type="text"
                />
                <span>feat.</span>
                <TextField
                  variant="outlined"
                  fullWidth
                  name="vocalistsName"
                  label="Vocalists Name"
                  type="text"
                />
              </Stack>
              <Grid container spacing={2} my={1}>
                <Grid item xs={12} md={6}>
                  {data?.tags && (
                    <Select
                      variant="outlined"
                      fullWidth
                      name="tags"
                      label="Tags"
                      multiple
                      renderValue={(selected) => (
                        <Stack direction="row" spacing={1}>
                          {data.tags
                            .filter((tag) =>
                              (selected as string[]).includes(tag.slug)
                            )
                            .map((tag) => (
                              <span
                                key={tag.slug}
                                style={{
                                  color: tag.color,
                                  border: `1px solid ${tag.color}`,
                                  borderRadius: 5,
                                  padding: "0 4px",
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}
                        </Stack>
                      )}
                    >
                      {data?.tags.map((tag) => (
                        <MenuItem
                          key={tag.slug}
                          value={tag.slug}
                          style={{ color: tag.color }}
                        >
                          {tag.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field name="creationDate">
                    {({ input: { onChange, ...input }, meta }) => {
                      return (
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                          <DateTimePicker
                            renderInput={({ error, helperText, ...props }) => (
                              <MuiTextField
                                fullWidth
                                {...props}
                                error={error || showErrorOnChange({ meta })}
                                helperText={
                                  showErrorOnChange({ meta })
                                    ? meta.error[0] || meta.submitError
                                    : helperText
                                }
                              />
                            )}
                            label="Created at"
                            ampm={false}
                            inputFormat="YYYY-MM-DD HH:mm:ss"
                            {...input}
                            onChange={(newValue) => {
                              onChange(newValue?.valueOf() ?? null);
                              form.mutators.setValue(
                                "creationDate",
                                newValue?.valueOf() ?? null
                              );
                            }}
                          />
                        </LocalizationProvider>
                      );
                    }}
                  </Field>
                </Grid>
              </Grid>

              <Typography
                variant="subtitle1"
                fontWeight={600}
                my={1}
                color="primary"
              >
                Songs
              </Typography>
              <FieldArray name="songs">
                {({ fields }) => (
                  <Stack gap={1}>
                    {fields.map((path, idx) => (
                      <Stack
                        direction="row"
                        gap={1}
                        key={path}
                        alignItems="start"
                      >
                        <SelectSongEntityBox
                          fieldName={path}
                          labelName={`Linked song #${idx + 1}`}
                        />
                        <IconButton
                          color="error"
                          onClick={() => fields.remove(idx)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    ))}
                    <Stack direction="row" gap={1} alignItems="start">
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        startIcon={<AddIcon />}
                        onClick={() => fields.push(null)}
                        sx={{ flexGrow: 1 }}
                      >
                        Add song relation
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => {
                          form.mutators.setValue(
                            "title",
                            fields.value.map((s) => s.name).join(", ")
                          );
                          form.mutators.setValue(
                            "producersName",
                            fields.value
                              .map((s) =>
                                s.artists
                                  .filter((a: any) =>
                                    a.ArtistOfSong.categories.includes(
                                      "Producer"
                                    )
                                  )
                                  .map(
                                    (a: any) =>
                                      a.ArtistOfSong.customName || a.name
                                  )
                              )
                              .flat()
                              .join(", ")
                          );
                          form.mutators.setValue(
                            "vocalistsName",
                            fields.value
                              .map((s) =>
                                s.artists
                                  .filter(
                                    (a: any) =>
                                      a.ArtistOfSong.categories.includes(
                                        "Vocalist"
                                      ) && !a.ArtistOfSong.isSupport
                                  )
                                  .map(
                                    (a: any) =>
                                      a.ArtistOfSong.customName || a.name
                                  )
                              )
                              .flat()
                              .join(", ")
                          );
                        }}
                      >
                        Populate
                      </Button>
                    </Stack>
                  </Stack>
                )}
              </FieldArray>

              <Typography
                variant="subtitle1"
                fontWeight={600}
                my={1}
                color="primary"
              >
                Verses
              </Typography>
              <FieldArray
                name="verses"
                subscription={{
                  error: true,
                  touched: true,
                  modified: true,
                  dirtySinceLastSubmit: true,
                  submitError: true,
                }}
              >
                {({ fields, meta }) => {
                  // eslint-disable-next-line react-hooks/rules-of-hooks
                  const verseFieldProps = useField("verses");
                  const verseValues = verseFieldProps.input.value;
                  const columns = Math.floor(
                    12 / Math.max(0, Math.min(3, fields.length))
                  );
                  return (
                    <>
                      <Grid container spacing={2}>
                        {fields.map((name, index) => {
                          return (
                            <Grid item key={name} md={columns} xs={12}>
                              <Stack
                                direction="row"
                                spacing={2}
                                alignItems="end"
                                my={1}
                              >
                                <TextField
                                  variant="outlined"
                                  size="small"
                                  fullWidth
                                  required
                                  name={`${name}.language`}
                                  label="Language"
                                  type="text"
                                />
                                <ButtonGroup variant="outlined" size="medium">
                                  <Tooltip title="Main Verse">
                                    <Button
                                      sx={{ px: 1 }}
                                      variant={
                                        verseValues[index].isMain
                                          ? "contained"
                                          : "outlined"
                                      }
                                      onClick={() => {
                                        fields.forEach((name, idx) => {
                                          fields.update(idx, {
                                            ...verseValues[idx],
                                            isMain: index === idx,
                                          });
                                        });
                                      }}
                                    >
                                      🄼
                                    </Button>
                                  </Tooltip>
                                  <Tooltip title="Original Verse">
                                    <Button
                                      color="secondary"
                                      sx={{ px: 1 }}
                                      variant={
                                        verseValues[index].isOriginal
                                          ? "contained"
                                          : "outlined"
                                      }
                                      onClick={() => {
                                        fields.forEach((name, idx) => {
                                          fields.update(idx, {
                                            ...verseValues[idx],
                                            isOriginal: index === idx,
                                          });
                                        });
                                      }}
                                    >
                                      🄾
                                    </Button>
                                  </Tooltip>
                                  <Tooltip title="Remove Verse">
                                    <Button
                                      color="error"
                                      onClick={() => fields.remove(index)}
                                      sx={{ px: 1 }}
                                    >
                                      <DeleteIcon />
                                    </Button>
                                  </Tooltip>
                                </ButtonGroup>
                              </Stack>
                              <TextField
                                variant="outlined"
                                margin="dense"
                                fullWidth
                                required
                                multiline
                                name={`${name}.text`}
                                label="Text"
                                type="text"
                                lang={verseValues[index].language}
                              />
                              <TextField
                                variant="outlined"
                                margin="dense"
                                size="small"
                                fullWidth
                                name={`${name}.translator`}
                                label="Translator"
                                type="text"
                              />
                              <Box my={1}>
                                <Accordion>
                                  <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{ display: "flex" }}
                                  >
                                    <Typography width="30%">
                                      Stylized text
                                    </Typography>
                                    <Typography
                                      noWrap
                                      color="text.secondary"
                                      sx={{ flexGrow: 1, width: 0 }}
                                      lang={verseValues[index].language}
                                    >
                                      {verseValues[index].stylizedText}
                                    </Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <TextField
                                      variant="outlined"
                                      margin="dense"
                                      size="small"
                                      fullWidth
                                      multiline
                                      name={`${name}.stylizedText`}
                                      label="Stylized text"
                                      type="text"
                                      lang={verseValues[index].language}
                                    />
                                  </AccordionDetails>
                                </Accordion>
                                <Accordion>
                                  <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{ display: "flex" }}
                                  >
                                    <Typography width="30%">HTML</Typography>
                                    <Typography
                                      noWrap
                                      color="text.secondary"
                                      sx={{ flexGrow: 1, width: 0 }}
                                      lang={verseValues[index].language}
                                    >
                                      {verseValues[index].html}
                                    </Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <TextField
                                      variant="outlined"
                                      margin="dense"
                                      size="small"
                                      fullWidth
                                      multiline
                                      name={`${name}.html`}
                                      label="HTML"
                                      type="text"
                                      inputProps={{
                                        sx: { fontFamily: monospacedFont },
                                      }}
                                      lang={verseValues[index].language}
                                    />
                                  </AccordionDetails>
                                </Accordion>
                                <Accordion>
                                  <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{ display: "flex" }}
                                  >
                                    <Typography width="30%">
                                      Typing sequence
                                    </Typography>
                                    <Typography
                                      noWrap
                                      color="text.secondary"
                                      sx={{ flexGrow: 1, width: 0 }}
                                      lang={verseValues[index].language}
                                    >
                                      {verseValues[index].typingSequence}
                                    </Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <TextField
                                      variant="outlined"
                                      margin="dense"
                                      size="small"
                                      fullWidth
                                      multiline
                                      name={`${name}.typingSequence`}
                                      label="Typing sequence"
                                      type="text"
                                      inputProps={{
                                        sx: { fontFamily: monospacedFont },
                                      }}
                                      lang={verseValues[index].language}
                                    />
                                    <Button
                                      variant="outlined"
                                      onClick={async () => {
                                        try {
                                          const result =
                                            await apolloClient.query<{
                                              transliterate: {
                                                typing: string[][][];
                                              };
                                            }>({
                                              query: TRANSLITRATION_QUERY,
                                              variables: {
                                                text: verseValues[index].text,
                                                language:
                                                  verseValues[index].language,
                                              },
                                              fetchPolicy: "no-cache",
                                            });
                                          fields.update(index, {
                                            ...verseValues[index],
                                            typingSequence: JSON.stringify(
                                              result.data.transliterate.typing
                                            ),
                                          });
                                        } catch (e) {
                                          console.error(
                                            "Transliteration error",
                                            e
                                          );
                                        }
                                      }}
                                    >
                                      Generate
                                    </Button>
                                  </AccordionDetails>
                                </Accordion>
                              </Box>
                            </Grid>
                          );
                        })}
                      </Grid>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        startIcon={<AddIcon />}
                        onClick={() =>
                          fields.push({
                            language: "",
                            text: "",
                            translator: "",
                            isMain: verseValues.length < 1,
                            isOriginal: verseValues.length < 1,
                            stylizedText: null,
                            html: null,
                            typingSequence: "[]",
                          })
                        }
                      >
                        Add verse
                      </Button>
                      {showErrorOnChange({ meta }) ? (
                        <FormHelperText error>
                          {JSON.stringify(meta.submitError || meta.error?.[0])}
                        </FormHelperText>
                      ) : (
                        false
                      )}
                    </>
                  );
                }}
              </FieldArray>

              <Typography
                variant="subtitle1"
                fontWeight={600}
                my={1}
                color="primary"
              >
                Pulses
              </Typography>
              <FieldArray name="pulses">
                {({ fields }) => (
                  <>
                    {fields.map((path, idx) => (
                      <Field name={path} key={idx}>
                        {({ input: { value } }) => (
                          <Stack direction="row" gap={1}>
                            <DateTimePickerPopup
                              value={value.creationDate}
                              onSubmit={(newValue) => {
                                fields.update(idx, {
                                  ...value,
                                  creationDate: newValue?.valueOf() ?? null,
                                });
                              }}
                            >
                              <Button
                                fullWidth
                                color="secondary"
                                sx={{
                                  justifyContent: "flex-start",
                                  px: 0,
                                  textTransform: "none",
                                }}
                              >
                                {dayjs(value.creationDate).format(
                                  "YYYY-MM-DD HH:mm:ss (Z)"
                                )}{" "}
                                ({dayjs(value.creationDate).fromNow()})
                              </Button>
                            </DateTimePickerPopup>
                            <IconButton
                              color="error"
                              onClick={() => fields.remove(idx)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        )}
                      </Field>
                    ))}
                    <DateTimePickerPopup
                      onSubmit={(newValue) => {
                        fields.push({
                          creationDate: newValue.valueOf(),
                        });
                      }}
                    >
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        startIcon={<AddIcon />}
                      >
                        Add pulse
                      </Button>
                    </DateTimePickerPopup>
                  </>
                )}
              </FieldArray>
              <Typography
                variant="subtitle1"
                fontWeight={600}
                my={1}
                color="primary"
              >
                Comment
              </Typography>
              <TextField
                variant="outlined"
                margin="dense"
                fullWidth
                multiline
                name="comment"
                label="Comment"
                type="text"
              />

              <FormSpy
                subscription={{
                  errors: true,
                }}
              >
                {(form) =>
                  Object.keys(form.errors).length > 0 && (
                    <FormHelperText error>
                      {JSON.stringify(form.errors)}
                    </FormHelperText>
                  )
                }
              </FormSpy>
              <Button
                disabled={submitting}
                onClick={handleSubmit}
                color="primary"
                variant="contained"
                sx={{ my: 1 }}
              >
                {!id ? "Create" : "Update"}
              </Button>
            </form>
          );
        }}
      </Form>
    </>
  );
}
