import { cloneElement, ReactElement, useId, useState } from "react";
import PopupState, { bindTrigger, bindPopover } from "material-ui-popup-state";
import dayjs, { Dayjs } from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { StaticDateTimePicker } from "@mui/x-date-pickers";
import { Alert, Box, Button, Popover } from "@mui/material";
import { DocumentNode, useMutation } from "@apollo/client";
import { gql, useQuery, useApolloClient } from "@apollo/client";
import { Tag } from "lyricova-common/models/Tag";
import { Field, Form, FormSpy, useField } from "react-final-form";
import { makeValidate, Select, showErrorOnChange, TextField } from "mui-rff";
import * as yup from "yup";
import { useSnackbar } from "notistack";
import SlugifyAdornment from "lyricova-common/components/SlugifyAdornment";
import { OnChange } from "react-final-form-listeners";
import slugify from "slugify";

const TAG_QUERY = gql`
  query Tag($slug: String!) {
    tag(slug: $slug) {
      color
      name
      slug
    }
  }
`;

const NEW_TAG_MUTATION = gql`
  mutation NewTag($data: NewTagInput!) {
    newTag(data: $data) {
      color
      name
      slug
    }
  }
`;

const UPDATE_TAG_MUTATION = gql`
  mutation UpdateTag($slug: String!, $data: UpdateTagInput!) {
    updateTag(slug: $slug, data: $data) {
      color
      name
      slug
    }
  }
`;

interface FormValues {
  name: string;
  slug: string;
  color: string;
}

export interface TagFormProps {
  slug?: string;
  onSubmit?: () => void;
}

export function TagForm({ slug = null, onSubmit }: TagFormProps) {
  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();
  const { data, loading, refetch } = useQuery<{ tag: Tag }>(TAG_QUERY, {
    variables: { slug },
  });

  if (slug && (loading || !data?.tag)) {
    return <Alert severity="info">Loading...</Alert>;
  }

  const initialValues: FormValues = {
    name: data?.tag?.name ?? "",
    slug: data?.tag?.slug ?? "",
    color: data?.tag?.color ?? "#ffffff",
  };

  const schema = yup.object().shape({
    name: yup.string().required(),
    slug: yup.string().required(),
    color: yup.string().required(),
  });

  return (
    <Form<FormValues>
      initialValues={initialValues}
      onSubmit={async (values) => {
        try {
          if (slug) {
            const result = await apolloClient.mutate({
              mutation: UPDATE_TAG_MUTATION,
              variables: {
                slug,
                data: values,
              },
            });
            onSubmit?.();
            refetch();
            snackbar.enqueueSnackbar("Tag updated", { variant: "success" });
          } else {
            const result = await apolloClient.mutate({
              mutation: NEW_TAG_MUTATION,
              variables: {
                data: values,
              },
            });
            onSubmit?.();
            snackbar.enqueueSnackbar("Tag created", { variant: "success" });
          }
        } catch (error) {
          snackbar.enqueueSnackbar(error.message, { variant: "error" });
          console.error(error);
        }
      }}
      validate={makeValidate(schema)}
    >
      {({ handleSubmit, submitting, values }) => (
        <form onSubmit={handleSubmit}>
          <TextField
            name="name"
            label="Name"
            required
            fullWidth
            disabled={submitting}
            variant="outlined"
            margin="dense"
          />
          <TextField
            name="slug"
            label="Slug"
            required
            fullWidth
            disabled={submitting}
            variant="outlined"
            margin="dense"
            InputProps={{
              endAdornment: (
                <SlugifyAdornment sourceName="name" destinationName="slug" />
              ),
            }}
          />
          <TextField
            name="color"
            label="Color"
            required
            fullWidth
            disabled={submitting}
            variant="outlined"
            margin="dense"
            InputProps={{
              endAdornment: (
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: values.color,
                    borderRadius: 1,
                    border: "1px solid rgba(255,255,255,0.23)",
                  }}
                />
              ),
            }}
          />
          <Button
            type="submit"
            disabled={submitting}
            color="primary"
            variant="contained"
          >
            Submit
          </Button>
          {/**
           * Slugify name while slug field is untouched.
           * @link https://codesandbox.io/s/52q597j2p?file=/src/index.js:579-587
           */}
          {!slug && (
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
          )}
        </form>
      )}
    </Form>
  );
}

export interface TagFormPopupProps extends TagFormProps {
  children: ReactElement<{
    "aria-controls"?: string;
    "aria-describedby"?: string;
    "aria-haspopup"?: true;
    onClick: (event: React.MouseEvent) => void;
    onTouchStart: (event: React.TouchEvent) => void;
  }>;
}

export function TagFormPopup({
  slug = null,
  onSubmit,
  children,
}: TagFormPopupProps) {
  const popupId = useId();
  return (
    <PopupState variant="popover" popupId={popupId}>
      {(popupState) => (
        <>
          {cloneElement(children, {
            ...bindTrigger(popupState),
          })}
          <Popover
            {...bindPopover(popupState)}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <Box p={2}>
              <TagForm
                slug={slug}
                onSubmit={() => {
                  onSubmit?.();
                  popupState.close();
                }}
              />
            </Box>
          </Popover>
        </>
      )}
    </PopupState>
  );
}
