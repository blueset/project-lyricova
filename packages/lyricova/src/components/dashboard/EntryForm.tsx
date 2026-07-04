"use client";

import { useQuery, useApolloClient } from "@apollo/client";
import { toast } from "sonner";
import { SelectSongEntityBox } from "@lyricova/components";
import { graphql } from "@lyricova/components/gql";
import type {
  EntryQuery,
  SelectSongEntryFragment,
} from "@lyricova/components/gql/graphql";
import { MultiSelect } from "@lyricova/components/components/ui/multi-select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@lyricova/components/components/ui/form";
import { Textarea } from "@lyricova/components/components/ui/textarea";
import { Input } from "@lyricova/components/components/ui/input";
import { Button } from "@lyricova/components/components/ui/button";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lyricova/components/components/ui/accordion";
import { Toggle } from "@lyricova/components/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { NavHeader } from "@/app/(private)/dashboard/NavHeader";
import { Plus, Trash2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DateTimePicker } from "@lyricova/components/components/ui/datetime-picker";
import { DateTimeInput } from "@lyricova/components/components/ui/datetime-input";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";

const monospacedFont =
  '"Rec Mono Casual", "Cascadia Code", "Fira Code", monospace';

/** Artist as embedded under a selected song (form `songs` are loosely typed). */
type SongArtist = NonNullable<SelectSongEntryFragment["artists"]>[number];

const ENTRY_FRAGMENT = graphql(`
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
`);

const ENTRY_QUERY = graphql(`
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
`);

const NEW_ENTRY_MUTATION = graphql(`
  mutation NewEntry($data: EntryInput!) {
    newEntry(data: $data) {
      ...EntryFragment
    }
  }
`);

const UPDATE_ENTRY_MUTATION = graphql(`
  mutation UpdateEntry($id: Int!, $data: EntryInput!) {
    updateEntry(data: $data, id: $id) {
      ...EntryFragment
    }
  }
`);

const TRANSLITRATION_QUERY = graphql(`
  query EntryFormTransliterate($text: String!, $language: String) {
    transliterate(text: $text) {
      typing(language: $language)
    }
  }
`);

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  producersName: z.string().optional(),
  vocalistsName: z.string().optional(),
  comment: z.string().nullable(),
  songs: z.array(
    z.any().refine((val) => val !== null, "Song entity must be selected")
  ),
  verses: z
    .array(
      z.object({
        id: z.number().optional(),
        text: z.string().min(1, "Text is required"),
        translator: z.string().nullable(),
        language: z.string().min(1, "Language is required"),
        isMain: z.boolean(),
        isOriginal: z.boolean(),
        stylizedText: z.string().nullable(),
        html: z.string().nullable(),
        typingSequence: z.string(),
      })
    )
    .min(1, "At least one verse is required")
    .refine((list) => list.filter((item) => item.isMain).length === 1, {
      message: "Only one main verse is allowed",
      path: [],
    })
    .refine((list) => list.filter((item) => item.isOriginal).length === 1, {
      message: "Only one original verse is allowed",
      path: [],
    }),
  tags: z.array(z.string()),
  pulses: z.array(
    z.any().refine((val) => val !== null, "Pulse entity must be selected")
  ),
  creationDate: z.date(),
});

type FormValues = z.infer<typeof formSchema>;

const initialFormValues = (entry: NonNullable<EntryQuery["entry"]>): FormValues => ({
  title: entry.title || "",
  producersName: entry.producersName || "",
  vocalistsName: entry.vocalistsName || "",
  comment: entry.comment || "",
  creationDate: new Date(entry.creationDate),
  songs: entry.songs ?? [],
  pulses: entry.pulses ?? [],
  tags: (entry.tags ?? []).map((tag) => tag.slug),
  verses: (entry.verses ?? []).map((verse) => ({
    id: verse.id,
    language: verse.language || "",
    text: verse.text || "",
    translator: verse.translator || "",
    isMain: verse.isMain,
    isOriginal: verse.isOriginal,
    stylizedText: verse.stylizedText || "",
    html: verse.html || "",
    typingSequence: JSON.stringify(verse.typingSequence),
  })),
});

interface EntityFormProps {
  id?: number;
}

export function EntryForm({ id }: EntityFormProps) {
  const apolloClient = useApolloClient();
  const router = useRouter();

  const { data, loading, refetch } = useQuery(ENTRY_QUERY, {
    variables: { id: id || -1, hasEntry: !!id },
  });

  const defaultValues = useMemo(
    () =>
      id && data?.entry
        ? initialFormValues(data.entry)
        : {
            title: "",
            producersName: "",
            vocalistsName: "",
            comment: "",
            songs: [],
            verses: [],
            tags: [],
            pulses: [],
            creationDate: new Date(),
          },
    [data, id]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: defaultValues,
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const {
    fields: verseFields,
    append: appendVerse,
    remove: removeVerse,
    update: updateVerse,
  } = useFieldArray({
    control: form.control,
    name: "verses",
  });

  const {
    fields: songFields,
    append: appendSong,
    remove: removeSong,
  } = useFieldArray({
    control: form.control,
    name: "songs",
  });

  const {
    fields: pulseFields,
    append: appendPulse,
    remove: removePulse,
    update: updatePulse,
  } = useFieldArray({
    control: form.control,
    name: "pulses",
  });

  if (loading || (id && !data?.entry) || !data?.tags) {
    return (
      <>
        <NavHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Entries", href: "/dashboard/entries" },
            { label: id ? `Entry #${id}` : "New Entry" },
          ]}
        />
        <Alert className="m-4 w-auto" variant="info">
          <AlertDescription>Loading...</AlertDescription>
        </Alert>
      </>
    );
  }

  async function onSubmit(values: FormValues) {
    try {
      const submitData = {
        title: values.title,
        producersName: values.producersName,
        vocalistsName: values.vocalistsName,
        creationDate: values.creationDate.valueOf() || Date.now().valueOf(),
        comment: values.comment || null,
        tagSlugs: values.tags,
        verses: values.verses.map((verse) => ({
          id: verse.id,
          language: verse.language,
          text: verse.text,
          isOriginal: verse.isOriginal,
          isMain: verse.isMain,
          stylizedText: verse.stylizedText || null,
          html: verse.html || null,
          typingSequence: JSON.parse(verse.typingSequence || "[]"),
          translator: verse.translator || null,
        })),
        songIds: (values.songs ?? []).map((song) => song.id),
        pulses: (values.pulses ?? []).map((pulse) => ({
          id: pulse.id || undefined,
          creationDate: pulse.creationDate.valueOf() || Date.now().valueOf(),
        })),
      };

      if (!id) {
        // create
        const result = await apolloClient.mutate({
          mutation: NEW_ENTRY_MUTATION,
          variables: { data: submitData },
        });
        if (result.data) {
          toast.success(
            `Entry ${result.data.newEntry.title} is successfully created.`
          );
          router.push(`/dashboard/entries/${result.data.newEntry.id}`);
        }
      } else {
        // update
        const result = await apolloClient.mutate({
          mutation: UPDATE_ENTRY_MUTATION,
          variables: { id, data: submitData },
        });
        if (result.data) {
          toast.success(
            `Entry ${result.data.updateEntry.title} is successfully updated.`
          );
          const outcome = await refetch();
          if (outcome.data) {
            if (outcome.data.entry) {
              form.reset(initialFormValues(outcome.data.entry));
            }
          }
        }
      }
    } catch (e) {
      console.error(
        `Error occurred while ${!id ? "creating" : "updating"} entry ${
          values?.title
        }.`,
        e
      );
      toast.error(
        `Error occurred while ${!id ? "creating" : "updating"} Entry ${
          values?.title
        }. (${e})`
      );
    }
  }

  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Entries", href: "/dashboard/entries" },
          { label: id ? `Entry #${id}` : "New Entry" },
        ]}
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="p-4 pt-0 grid grid-cols-1 gap-4 @3xl/dashboard:grid-cols-2 @6xl/dashboard:grid-cols-6"
        >
          <div className="@3xl/dashboard:col-span-2 flex flex-col gap-4 @6xl/dashboard:col-span-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-2 @6xl/dashboard:col-span-2">
              <FormField
                control={form.control}
                name="producersName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Producers Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <span className="mt-8">feat.</span>
              <FormField
                control={form.control}
                name="vocalistsName"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Vocalists Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 @3xl/dashboard:flex-row @6xl/dashboard:flex-col @3xl/dashboard:col-span-2 @6xl/dashboard:col-span-2">
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => {
                const tagOptions = data?.tags.map((tag) => ({
                  value: tag.slug,
                  label: tag.name,
                  color: tag.color,
                }));
                const selectedOptions =
                  tagOptions?.filter((option) =>
                    field.value?.includes(option.value)
                  ) || [];

                return (
                  <FormItem className="flex-1">
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <MultiSelect
                        isMulti
                        options={tagOptions}
                        value={selectedOptions}
                        onChange={(selected) => {
                          field.onChange(
                            selected
                              ? selected.map((option) => option.value)
                              : []
                          );
                        }}
                        getOptionValue={(option) => option.value}
                        getOptionLabel={(option) => option.label}
                        formatOptionLabel={(option) => (
                          <span style={{ color: option.color }}>
                            {option.label}
                          </span>
                        )}
                        placeholder="Select tags..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="creationDate"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Created at</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      timePicker={{ hour: true, minute: true, second: true }}
                      renderTrigger={({ open, value, setOpen }) => (
                        <DateTimeInput
                          value={value}
                          onChange={(x) => !open && field.onChange(x)}
                          disabled={open}
                          onCalendarClick={() => setOpen(!open)}
                        />
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Songs section */}
          <div className="col-span-full @6xl/dashboard:col-span-3 flex flex-col gap-2">
            <div className="flex flex-row justify-between items-center">
              <h3 className="text-lg font-semibold">Songs</h3>
              <div className="flex flex-row gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => appendSong(null)}
                >
                  <Plus />
                  Add song
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const songs = form.getValues("songs") ?? [];

                    form.setValue("title", songs.map((s) => s.name).join(", "));
                    form.setValue(
                      "producersName",
                      songs
                        .map((s) =>
                          (s.artists || [])
                            .filter((a: SongArtist) =>
                              a.ArtistOfSong?.categories.includes("Producer")
                            )
                            .map(
                              (a: SongArtist) =>
                                a.ArtistOfSong?.customName || a.name
                            )
                        )
                        .flat()
                        .join(", ")
                    );
                    form.setValue(
                      "vocalistsName",
                      songs
                        .map((s) =>
                          (s.artists || [])
                            .filter(
                              (a: SongArtist) =>
                                a.ArtistOfSong?.categories.includes(
                                  "Vocalist"
                                ) && !a.ArtistOfSong.isSupport
                            )
                            .map(
                              (a: SongArtist) =>
                                a.ArtistOfSong?.customName || a.name
                            )
                        )
                        .flat()
                        .join(", ")
                    );
                  }}
                >
                  Populate
                </Button>
              </div>
            </div>
            {songFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                <SelectSongEntityBox
                  fieldName={`songs.${index}`}
                  labelName={`Linked song #${index + 1}`}
                  form={form}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSong(index)}
                  className="text-destructive-foreground mt-5"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>

          {/* Pulses section */}
          <div className="col-span-full @6xl/dashboard:col-span-3 flex flex-col gap-2">
            <div className="flex flex-row justify-between items-center">
              <h3 className="text-lg font-semibold">Pulses</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendPulse({
                    creationDate: new Date(),
                  })
                }
              >
                <Plus />
                Add pulse
              </Button>
            </div>
            {pulseFields.map((field, index) => (
              <div key={field.id} className="flex items-center">
                <FormField
                  control={form.control}
                  name={`pulses.${index}.creationDate`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          timePicker={{
                            hour: true,
                            minute: true,
                            second: true,
                          }}
                          renderTrigger={({ open, value, setOpen }) => (
                            <DateTimeInput
                              value={value}
                              onChange={(x) => !open && field.onChange(x)}
                              disabled={open}
                              onCalendarClick={() => setOpen(!open)}
                              className="w-full"
                              endAdornment={
                                <>
                                  (
                                  {value
                                    ? formatDistanceToNow(value, {
                                        addSuffix: true,
                                      })
                                    : "unknown"}
                                  )
                                </>
                              }
                            />
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePulse(index)}
                  className="text-destructive-foreground"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>

          {/* Continue with Verses section */}
          <div className="col-span-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold mb-2">Verses</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendVerse({
                    language: "",
                    text: "",
                    translator: "",
                    isMain: verseFields.length < 1,
                    isOriginal: verseFields.length < 1,
                    stylizedText: null,
                    html: null,
                    typingSequence: "[]",
                  })
                }
              >
                <Plus />
                Add verse
              </Button>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(40ch,1fr))] gap-4">
              {verseFields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex-1 col-span-1 row-span-4 grid grid-rows-subgrid gap-2"
                >
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name={`verses.${index}.language`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input {...field} placeholder="Language" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-1">
                      <FormField
                        control={form.control}
                        name={`verses.${index}.isMain`}
                        render={({ field }) => (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <FormItem>
                                <FormControl>
                                  <Toggle
                                    variant="primary"
                                    size="icon"
                                    pressed={!!field.value}
                                    onPressedChange={(pressed: boolean) => {
                                      if (pressed) {
                                        // Set current to true
                                        field.onChange(true);
                                        // Set others to false
                                        verseFields.forEach((_, idx) => {
                                          if (idx !== index) {
                                            form.setValue(
                                              `verses.${idx}.isMain`,
                                              false
                                            );
                                          }
                                        });
                                      } else {
                                        // Allow unchecking, validation will handle the "exactly one" rule
                                        field.onChange(false);
                                      }
                                    }}
                                    aria-label="Toggle main verse"
                                  >
                                    🄼
                                  </Toggle>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            </TooltipTrigger>
                            <TooltipContent>Main Verse</TooltipContent>
                          </Tooltip>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`verses.${index}.isOriginal`}
                        render={({ field }) => (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <FormItem>
                                <FormControl>
                                  <Toggle
                                    variant="primary"
                                    size="icon"
                                    pressed={!!field.value}
                                    onPressedChange={(pressed: boolean) => {
                                      if (pressed) {
                                        // Set current to true
                                        field.onChange(true);
                                        // Set others to false
                                        verseFields.forEach((_, idx) => {
                                          if (idx !== index) {
                                            form.setValue(
                                              `verses.${idx}.isOriginal`,
                                              false
                                            );
                                          }
                                        });
                                      } else {
                                        // Allow unchecking, validation will handle the "exactly one" rule
                                        field.onChange(false);
                                      }
                                    }}
                                    aria-label="Toggle original verse"
                                  >
                                    🄾
                                  </Toggle>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            </TooltipTrigger>
                            <TooltipContent>Original Verse</TooltipContent>
                          </Tooltip>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive-foreground"
                        onClick={() => removeVerse(index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name={`verses.${index}.text`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea {...field} placeholder="Text" autoResize />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`verses.${index}.translator`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Translator" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Accordion type="single" collapsible>
                    <AccordionItem value="stylized">
                      <AccordionTrigger>
                        <div className="flex items-center justify-between w-full">
                          <span>Stylized text</span>
                          <span className="text-muted-foreground truncate ml-2 w-0 grow">
                            {form.watch(`verses.${index}.stylizedText`)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <FormField
                          control={form.control}
                          name={`verses.${index}.stylizedText`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea {...field} value={field.value ?? ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="html">
                      <AccordionTrigger>
                        <div className="flex items-center justify-between w-full">
                          <span>HTML</span>
                          <span className="text-muted-foreground truncate ml-2 w-0 grow">
                            {form.watch(`verses.${index}.html`)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <FormField
                          control={form.control}
                          name={`verses.${index}.html`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  value={field.value ?? ""}
                                  style={{ fontFamily: monospacedFont }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="typing">
                      <AccordionTrigger>
                        <div className="flex items-center justify-between w-full">
                          <span>Typing sequence</span>
                          <span className="text-muted-foreground truncate ml-2 w-0 grow">
                            {form.watch(`verses.${index}.typingSequence`)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <FormField
                          control={form.control}
                          name={`verses.${index}.typingSequence`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  style={{ fontFamily: monospacedFont }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2"
                          onClick={async () => {
                            try {
                              const result = await apolloClient.query({
                                query: TRANSLITRATION_QUERY,
                                variables: {
                                  text: form.getValues(`verses.${index}.text`),
                                  language: form.getValues(
                                    `verses.${index}.language`
                                  ),
                                },
                                fetchPolicy: "no-cache",
                              });
                              updateVerse(index, {
                                ...form.getValues(`verses.${index}`),
                                typingSequence: JSON.stringify(
                                  result.data.transliterate.typing
                                ),
                              });
                            } catch (e) {
                              console.error("Transliteration error", e);
                            }
                          }}
                        >
                          Generate
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ))}
            </div>
            {form.formState.errors.verses?.root && (
              <p
                data-slot="form-message"
                className="text-destructive-foreground text-sm"
              >
                {form.formState.errors.verses?.root.message}
              </p>
            )}
          </div>
          <div className="col-span-full">
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comment</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <ProgressButton
            type="submit"
            progress={form.formState.isSubmitting}
            className="col-span-full"
          >
            {!id ? "Create" : "Update"}
          </ProgressButton>
        </form>
      </Form>
    </>
  );
}
