import type { ReactElement } from "react";
import { useState } from "react";
import { gql, useQuery, useApolloClient } from "@apollo/client";
import type { Tag } from "@lyricova/api/graphql/types";
import { toast } from "sonner";
import { SlugifyAdornment } from "@lyricova/components";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lyricova/components/components/ui/popover";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lyricova/components/components/ui/form";
import { Input } from "@lyricova/components/components/ui/input";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";

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

const formSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  color: z.string().min(1),
});

export interface TagFormProps {
  slug?: string;
  onSubmit?: () => void;
}

export function TagForm({ slug = null, onSubmit }: TagFormProps) {
  const apolloClient = useApolloClient();
  const { data, loading, refetch } = useQuery<{ tag: Tag }>(TAG_QUERY, {
    variables: { slug },
  });

  const values = {
    name: data?.tag?.name ?? "",
    slug: data?.tag?.slug ?? "",
    color: data?.tag?.color ?? "#ffffff",
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values,
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  if (slug && (loading || !data?.tag)) {
    return (
      <Alert variant="info">
        <AlertDescription>Loading...</AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            if (slug) {
              await apolloClient.mutate({
                mutation: UPDATE_TAG_MUTATION,
                variables: {
                  slug,
                  data: values,
                },
              });
              onSubmit?.();
              refetch();
              toast.success("Tag updated");
            } else {
              await apolloClient.mutate({
                mutation: NEW_TAG_MUTATION,
                variables: {
                  data: values,
                },
              });
              onSubmit?.();
              toast.success("Tag created");
            }
          } catch (error) {
            toast.error(error.message);
            console.error(error);
          }
        })}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <SlugifyAdornment
                  form={form}
                  sourceName="name"
                  destinationName="slug"
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <div
                  className="w-8 h-8 rounded flex-shrink-0 flex-grow-1 border border-gray-300"
                  style={{
                    backgroundColor: field.value,
                  }}
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          variant="default"
        >
          Submit
        </Button>
      </form>
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
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" side="bottom">
        <TagForm
          slug={slug}
          onSubmit={() => {
            onSubmit?.();
            setIsOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
