import { Entry } from "lyricova-common/models/Entry";
import { Song } from "lyricova-common/models/Song";
import { Verse } from "lyricova-common/models/Verse";
import { Tag } from "lyricova-common/models/Tag";
import { Pulse } from "lyricova-common/models/Pulse";
import { gql, useQuery, useApolloClient } from "@apollo/client";
import { useSnackbar } from "notistack";
import * as yup from "yup";
import {
  Checkboxes,
  makeValidate,
  Select,
  showErrorOnChange,
  TextField,
} from "mui-rff";
import { Field, Form, useField } from "react-final-form";
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
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import { Fragment } from "react";
import { Box } from "@mui/system";

const monospacedFont =
  '"Rec Mono Casual", "Cascadia Code", "Fira Code", monospace';

const ENTRY_QUERY = gql`
  query Entry($id: Int!) {
    entry(id: $id) {
      id
      title
      producersName
      vocalistsName
      comment
      songs {
        id
        name
        artists {
          name
        }
        albums {
          id
          name
        }
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
    tags {
      color
      name
      slug
    }
  }
`;

const TRANSLITRATION_QUERY = gql`
  query($text: String!, $language: String) {
    transliterate(text: $text) {
      typing(language: $language)
    }
  }
`;

interface FormValues {
  title: string;
  producersName: string;
  vocalistsName: string;
  comment: string;
  songs: Partial<Song>[];
  verses: Partial<
    Omit<Verse, "typingSequence"> & {
      typingSequence?: string;
    }
  >[];
  tags: string[];
  pulses: Partial<Pulse>[];
}

declare module "yup" {
  interface ArraySchema<T> {
    onlyOneTrue(propertyPath: string, message?: any): ArraySchema<T>;
  }
}

yup.addMethod<yup.ArraySchema<yup.ObjectSchema<any>>>(
  yup.array,
  "onlyOneTrue",
  function(propertyPath, message) {
    return this.test("onlyOneTrue", message, function(list) {
      const trueCount = list.filter((item) => item[propertyPath]).length;
      console.log("onlyOneTrue", trueCount, propertyPath);
      return trueCount === 1;
    });
  }
);

interface EntityFormProps {
  id?: number;
}

export function EntryForm({ id }: EntityFormProps) {
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  const { data, error, loading } = useQuery<{ entry?: Entry; tags: Tag[] }>(
    ENTRY_QUERY,
    {
      variables: { id },
    }
  );

  if (id && (loading || !data?.entry || !data.tags)) {
    return <Alert severity="info">Loading...</Alert>;
  }

  const initialValues: FormValues = !id
    ? {
        title: "",
        producersName: "",
        vocalistsName: "",
        comment: "",
        songs: [],
        verses: [],
        tags: [],
        pulses: [],
      }
    : {
        ...data.entry,
        tags: data.entry.tags.map((tag) => tag.slug),
        verses: data.entry.verses.map((verse) => ({
          ...verse,
          typingSequence: JSON.stringify(verse.typingSequence),
        })),
      };

  const schema = yup.object({
    title: yup.string().required(),
    producersName: yup.string(),
    vocalistsName: yup.string(),
    comment: yup.string(),
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
      // .onlyOneTrue("isMain", "Only one main verse is allowed.")
      // .onlyOneTrue("isOriginal", "Only one original verse is allowed.")
      .test(
        "onlyOneMain",
        "Only one main verse is allowed.",
        (list) => list.filter((item) => item["isMain"]).length === 1
      )
      .test(
        "onlyOneOriginal",
        "Only one original verse is allowed.",
        (list) => list.filter((item) => item["isOriginal"]).length === 1
      ),
    tags: yup.array(yup.string()),
    pulses: yup.array(yup.object().typeError("Pulse entity must be selected")),
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
        onSubmit={async (values) => {}}
      >
        {({ values, submitting, handleSubmit }) => {
          return (
            <>
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
              {data?.tags && (
                <Select
                  variant="outlined"
                  margin="dense"
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
                                          const result = await apolloClient.query<{
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
                            isMain: false,
                            isOriginal: false,
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
                          {meta.submitError ?? meta.error?.[0]}
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
                Songs
              </Typography>
              <FieldArray name="songs">
                {({ fields }) => (
                  <>
                    {fields.map((i) => (
                      <span key={i}>{i}</span>
                    ))}
                    <Button
                      fullWidth
                      variant="outlined"
                      color="secondary"
                      startIcon={<AddIcon />}
                      onClick={() => fields.push(null)}
                    >
                      Add song relation
                    </Button>
                  </>
                )}
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
                    {fields.map((i) => (
                      <span key={i}>{i}</span>
                    ))}
                    <Button
                      fullWidth
                      variant="outlined"
                      color="secondary"
                      startIcon={<AddIcon />}
                      // onClick={() => fields.push(null)}
                    >
                      Add pulse
                    </Button>
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
            </>
          );
        }}
      </Form>
    </>
  );
}
