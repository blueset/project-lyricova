import { useCallback } from "react";
import { gql, useApolloClient } from "@apollo/client";
import type { HmikuAtWikiSearchResultEntry } from "@lyricova/api/graphql/types";
import { useNamedState } from "../../../../../hooks/useNamedState";
import HMikuWikiResultDialog from "./HMikuWikiResultDialog";
import type { DocumentNode } from "graphql";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@lyricova/components/components/ui/button";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lyricova/components/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lyricova/components/components/ui/form";
import { Input } from "@lyricova/components/components/ui/input";

const HMIKU_ATWIKI_LYRICS_QUERY = gql`
  query ($keyword: String!) {
    hmikuLyricsSearch(keyword: $keyword) {
      id
      name
      desc
    }
  }
` as DocumentNode;

const formSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props extends FormValues {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
}

export default function HMikuWikiSearchDialog({
  isOpen,
  toggleOpen,
  keyword,
}: Props) {
  const handleClose = useCallback(() => {
    toggleOpen(false);
  }, [toggleOpen]);

  const apolloClient = useApolloClient();

  const [searchResults, setSearchResults] = useNamedState<
    HmikuAtWikiSearchResultEntry[]
  >([], "searchResults");
  const [selectedArticleId, setSelectedArticleId] = useNamedState<
    string | null
  >(null, "selectedArticleId");
  const [showSingleDialog, toggleShowSingleDialog] = useNamedState<boolean>(
    false,
    "showSingleDialog"
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keyword: keyword ?? "",
    },
  });

  const handleChoose = useCallback(
    (articleId: string) => () => {
      setSelectedArticleId(articleId);
      toggleShowSingleDialog(true);
    },
    [setSelectedArticleId, toggleShowSingleDialog]
  );

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await apolloClient.query<{
        hmikuLyricsSearch: HmikuAtWikiSearchResultEntry[];
      }>({
        query: HMIKU_ATWIKI_LYRICS_QUERY,
        variables: {
          ...values,
        },
      });
      if (result.data) setSearchResults(result.data.hmikuLyricsSearch);
      else setSearchResults([]);
    } catch (e) {
      setSearchResults([]);
      console.error(`Error while loading search result; ${e}`, e);
      toast.error(`Failed to load search results: ${e}`);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={toggleOpen}>
        <DialogContent className="sm:max-w-[600px] grid-rows-[auto_auto_1fr_auto]">
          <DialogHeader>
            <DialogTitle>Search form 初音ミク@wiki</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex items-end gap-2"
            >
              <FormField
                control={form.control}
                name="keyword"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>Keyword</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter keyword" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ProgressButton
                type="submit"
                variant="secondary"
                progress={form.formState.isSubmitting}
              >
                Search
              </ProgressButton>
            </form>
          </Form>
          <div className="overflow-auto max-h-[400px] -mr-6 pr-6">
            {searchResults.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={handleChoose(v.id)}
                className="block w-full text-left p-2 hover:bg-accent rounded-md"
              >
                <div className="text-sm font-medium">
                  {v.name} (#{v.id})
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {v.desc}
                </div>
              </button>
            ))}
            {searchResults.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">
                No results found.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <HMikuWikiResultDialog
        isOpen={showSingleDialog}
        toggleOpen={toggleShowSingleDialog}
        articleId={selectedArticleId}
      />
    </>
  );
}
