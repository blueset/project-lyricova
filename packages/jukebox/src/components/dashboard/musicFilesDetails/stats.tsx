import { DocumentNode, gql, useApolloClient } from "@apollo/client";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lyricova/components/components/ui/form";
import { Input } from "@lyricova/components/components/ui/input";
import { Button } from "@lyricova/components/components/ui/button";
import { DateTimePicker } from "@lyricova/components/components/ui/datetime-picker";
import { DateTimeInput } from "@lyricova/components/components/ui/datetime-input";

const UPDATE_MUSIC_FILE_STATS_MUTATION = gql`
  mutation ($fileId: Int!, $playCount: Int!, $lastPlayed: Date) {
    updateMusicFileStats(
      fileId: $fileId
      playCount: $playCount
      lastPlayed: $lastPlayed
    ) {
      trackName
    }
  }
` as DocumentNode;

const formSchema = z.object({
  playCount: z.number().min(0, "Play count must be 0 or greater").optional(),
  lastPlayed: z.date().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

interface Props {
  fileId: number;
  playCount?: number;
  lastPlayed?: Date;
  refresh: () => unknown | Promise<unknown>;
}

export default function StatsPanel({
  fileId,
  playCount,
  lastPlayed,
  refresh,
}: Props) {
  const apolloClient = useApolloClient();
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    values: {
      playCount: playCount ?? 0,
      lastPlayed: lastPlayed ? new Date(lastPlayed) : undefined,
    },
    resetOptions: {
      keepDefaultValues: true,
    },
  });

  const onSubmit = async (values: FormSchema) => {
    try {
      const result = await apolloClient.mutate<{
        updateMusicFileStats: { trackName: string };
      }>({
        mutation: UPDATE_MUSIC_FILE_STATS_MUTATION,
        variables: {
          fileId,
          playCount: values.playCount,
          lastPlayed: values.lastPlayed?.valueOf() ?? null,
        },
      });

      if (result.data?.updateMusicFileStats?.trackName) {
        toast.success(
          `Stats of "${result.data?.updateMusicFileStats?.trackName}" is successfully updated.`
        );
        await refresh();
      }
    } catch (e) {
      console.error("Error occurred while updating stats.", e);
      toast.error(`Error occurred while updating stats: ${e}`);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="@2xl/dashboard:space-y-4"
      >
        <FormField
          control={form.control}
          name="playCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Play Count</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  disabled={form.formState.isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastPlayed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Played</FormLabel>
              <FormControl>
                <DateTimePicker
                  value={field.value}
                  onChange={field.onChange}
                  timePicker={{ hour: true, minute: true, second: true }}
                  renderTrigger={({ open, value, setOpen }) => (
                    <DateTimeInput
                      value={value}
                      onChange={(x) => !open && field.onChange(x)}
                      disabled={open || form.formState.isSubmitting}
                      onCalendarClick={() => setOpen(!open)}
                    />
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="outline"
          disabled={form.formState.isSubmitting}
        >
          Update
        </Button>
      </form>
    </Form>
  );
}
