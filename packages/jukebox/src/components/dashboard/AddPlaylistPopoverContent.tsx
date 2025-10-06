"use client";

import { useForm } from "react-hook-form";
import PlaylistAvatar from "../PlaylistAvatar";
import { SlugifyAdornment } from "@lyricova/components";
import type { DocumentNode } from "@apollo/client";
import { gql, useApolloClient } from "@apollo/client";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@lyricova/components/components/ui/form";
import { Input } from "@lyricova/components/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@lyricova/components/components/ui/input-group";
import { Button } from "@lyricova/components/components/ui/button";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import { Check, X } from "lucide-react";

const NEW_PLAYLIST_MUTATION = gql`
  mutation ($name: String!, $slug: String!) {
    newPlaylist(data: { name: $name, slug: $slug }) {
      name
      slug
    }
  }
` as DocumentNode;

interface FormValues {
  name: string;
  slug: string;
}

interface Props {
  refresh: () => unknown | Promise<unknown>;
  dismiss: () => void;
}

export default function AddPlaylistPopoverContent({ refresh, dismiss }: Props) {
  const apolloClient = useApolloClient();
  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await apolloClient.mutate({
        mutation: NEW_PLAYLIST_MUTATION,
        variables: values,
      });
      await refresh();
      dismiss();
    } catch (e) {
      console.error("Error occurred while creating playlist:", e);
      toast.error(`Error occurred while creating playlist: ${e}`);
    }
  };

  const values = form.watch();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-[auto_1fr_auto] items-center @2xl/dashboard:flex-row flex-row gap-4"
      >
        <PlaylistAvatar
          name={values.name || ""}
          slug={values.slug || ""}
          className="text-[3rem] aspect-square h-full shrink-0"
        />
        <div className="flex flex-col grow gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Name" required {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <InputGroup>
                  <FormControl>
                    <InputGroupInput placeholder="Slug" required {...field} />
                  </FormControl>
                  <InputGroupAddon align="inline-end">
                    <SlugifyAdornment
                      form={form}
                      sourceName="name"
                      destinationName="slug"
                    />
                  </InputGroupAddon>
                </InputGroup>
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <ProgressButton
            type="submit"
            size="icon"
            progress={form.formState.isSubmitting}
          >
            <Check />
          </ProgressButton>
          <Button type="button" size="icon" variant="outline" onClick={dismiss}>
            <X />
          </Button>
        </div>
      </form>
    </Form>
  );
}
