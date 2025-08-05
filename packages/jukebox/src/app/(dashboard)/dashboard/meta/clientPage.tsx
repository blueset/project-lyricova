"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { gql, useQuery, useApolloClient } from "@apollo/client";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lyricova/components/components/ui/form";
import { Textarea } from "@lyricova/components/components/ui/textarea";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import { NavHeader } from "../NavHeader";

const GET_SITE_META_QUERY = gql`
  query GetSiteMeta($key: String!, $default: String!) {
    getSiteMeta(key: $key, default: $default)
  }
`;

const SET_SITE_META_MUTATION = gql`
  mutation SetSiteMeta($key: String!, $value: String!) {
    setSiteMeta(key: $key, value: $value)
  }
`;

const formSchema = z.object({
  llmModels: z
    .string()
    .min(1, "LLM Models value is required")
    .refine(
      (value) => {
        try {
          const parsed = JSON.parse(value);
          return (
            Array.isArray(parsed) &&
            parsed.every((item) => typeof item === "string")
          );
        } catch {
          return false;
        }
      },
      {
        message:
          'Must be a valid JSON array of strings (e.g., ["model1", "model2"])',
      }
    ),
});

type FormValues = z.infer<typeof formSchema>;

export function SiteMetaClient() {
  const apolloClient = useApolloClient();

  const { data, loading, error, refetch } = useQuery(GET_SITE_META_QUERY, {
    variables: {
      key: "llmModels",
      default: "[]",
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      llmModels: "[]",
    },
  });

  // Update form when data is loaded
  useEffect(() => {
    if (data?.getSiteMeta) {
      form.setValue("llmModels", data.getSiteMeta);
    }
  }, [data, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await apolloClient.mutate({
        mutation: SET_SITE_META_MUTATION,
        variables: {
          key: "llmModels",
          value: values.llmModels,
        },
      });

      if (result.data?.setSiteMeta) {
        toast.success("LLM Models updated successfully!");
        await refetch();
      } else {
        toast.error("Failed to update LLM Models");
      }
    } catch (error) {
      console.error("Error updating LLM Models:", error);
      toast.error(`Error: ${error.message || "Failed to update LLM Models"}`);
    }
  };

  if (loading) {
    return (
      <>
        <NavHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Site Meta" },
          ]}
        />
        <Alert variant="info" className="m-4">
          <AlertDescription>
            Loading LLM Models configuration...
          </AlertDescription>
        </Alert>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Site Meta" },
          ]}
        />
        <Alert variant="destructive" className="m-4">
          <AlertDescription>
            Error loading LLM Models: {error.message}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Site Meta" },
        ]}
      />
      <div className="p-4 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Site Meta Configuration</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="llmModels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LLM Models</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder='["model1", "model2", "model3"]'
                      className="font-mono"
                      rows={6}
                      autoResize
                    />
                  </FormControl>
                  <div className="text-sm text-muted-foreground">
                    Enter a JSON array of strings representing the available LLM
                    models.
                    <br />
                    Example:{" "}
                    <code>
                      [&quot;gpt-4&quot;, &quot;gpt-3.5-turbo&quot;,
                      &quot;claude-3&quot;]
                    </code>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ProgressButton
              type="submit"
              progress={form.formState.isSubmitting}
              className="w-full"
            >
              Save LLM Models
            </ProgressButton>
          </form>
        </Form>
      </div>
    </>
  );
}

export default SiteMetaClient;
