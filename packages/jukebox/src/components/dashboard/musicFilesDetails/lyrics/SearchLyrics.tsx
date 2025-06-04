import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lyricova/components/components/ui/avatar";
import { Badge } from "@lyricova/components/components/ui/badge";
import { Button } from "@lyricova/components/components/ui/button";
import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import { Input } from "@lyricova/components/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lyricova/components/components/ui/form";
import { gql, useApolloClient } from "@apollo/client";
import { useNamedState } from "../../../../hooks/useNamedState";
import type { LyricsKitLyricsEntry } from "@lyricova/api/graphql/types";
import { toast } from "sonner";
import { Check, Copy, Images, Loader2, Music, X } from "lucide-react";
import type { LyricsAnalysisResult } from "@/frontendUtils/lyricsCheck";
import { lyricsAnalysis } from "@/frontendUtils/lyricsCheck";
import { Lyrics } from "lyrics-kit/core";
import { ComponentProps, useCallback, useMemo, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import type { DocumentNode } from "graphql";
import type { Subscription } from "zen-observable-ts";
import { cn } from "@lyricova/components/utils";

const SEARCH_LYRICS_QUERY = gql`
  query (
    $title: String!
    $artists: String!
    $duration: Float
    $sessionId: String
  ) {
    lyricsKitSearch(
      title: $title
      artists: $artists
      options: { duration: $duration, useLRCX: true }
      sessionId: $sessionId
    )
      @connection(
        key: "lyricsKitSearch"
        filter: ["title", "artists", "options"]
      ) {
      lyrics
      quality
      isMatched
      metadata
      tags
    }
  }
` as DocumentNode;

const SEARCH_LYRICS_PROGRESS_SUBSCRIPTION = gql`
  subscription ($sessionId: String!) {
    lyricsKitSearchIncremental(sessionId: $sessionId) {
      lyrics
      quality
      isMatched
      metadata
      tags
    }
  }
` as DocumentNode;

function AnalysisBadge({
  variant,
  className,
  children,
  ...props
}: ComponentProps<typeof Badge>) {
  return (
    <Badge
      variant={variant}
      className={cn("mr-1 mb-1 text-xs", className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

function InlineAnalysisResult({
  result,
  duration,
  length,
}: {
  result?: LyricsAnalysisResult;
  duration: number;
  length?: number;
}) {
  const lengthChip = !length ? (
    <AnalysisBadge variant="outline">?? seconds</AnalysisBadge>
  ) : Math.abs(length - duration) < 3 ? (
    <AnalysisBadge variant="success">{length} seconds</AnalysisBadge>
  ) : (
    <AnalysisBadge variant="outline">{length} seconds</AnalysisBadge>
  );

  if (result) {
    const translation = result.hasTranslation ? (
      <AnalysisBadge variant="success">
        <Check className="h-3 w-3" />
        Translation
      </AnalysisBadge>
    ) : (
      <AnalysisBadge variant="outline">
        <X className="h-3 w-3" />
        Translation
      </AnalysisBadge>
    );
    const inlineTimeTags = result.hasInlineTimeTags ? (
      <AnalysisBadge variant="success">
        <Check className="h-3 w-3" />
        Inline time tags
      </AnalysisBadge>
    ) : (
      <AnalysisBadge variant="outline">
        <X className="h-3 w-3" />
        Inline time tags
      </AnalysisBadge>
    );
    const furigana = result.hasFurigana ? (
      <AnalysisBadge variant="success">
        <Check className="h-3 w-3" />
        Furigana
      </AnalysisBadge>
    ) : (
      <AnalysisBadge variant="outline">
        <X className="h-3 w-3" />
        Furigana
      </AnalysisBadge>
    );
    const simplifiedJapanese = result.hasSimplifiedJapanese ? (
      <AnalysisBadge variant="destructive">
        <Check className="h-3 w-3" />
        Simplified Japanese
      </AnalysisBadge>
    ) : (
      <AnalysisBadge variant="success">
        <X className="h-3 w-3" />
        Simplified Japanese
      </AnalysisBadge>
    );
    const lastTimestamp =
      result.lastTimestamp < duration ? (
        <AnalysisBadge variant="success">
          Last line: {result.lastTimestamp} seconds
        </AnalysisBadge>
      ) : (
        <AnalysisBadge variant="outline">
          Last line: {result.lastTimestamp} seconds
        </AnalysisBadge>
      );

    return (
      <div className="mt-1 flex flex-wrap items-center">
        {lengthChip}
        {translation}
        {inlineTimeTags}
        {furigana}
        {simplifiedJapanese}
        {lastTimestamp}
      </div>
    );
  } else {
    return (
      <div className="mt-1 flex flex-wrap items-center">
        {lengthChip}
        <AnalysisBadge variant="destructive">
          <X className="mr-1 h-3 w-3" />
          Parse failed
        </AnalysisBadge>
      </div>
    );
  }
}

function SourceBadge({ children }: { children: unknown }) {
  const truncated = `${children || "??"}`.substring(0, 2);
  // Basic color mapping, can be expanded
  const bgColorClass = useMemo(() => {
    switch (truncated.toLowerCase()) {
      case "ne":
        return "bg-red-700";
      case "qq":
        return "bg-green-600";
      case "ku":
        return "bg-blue-800";
      case "xi":
        return "bg-orange-700";
      case "ge":
        return "bg-pink-700";
      case "vi":
        return "bg-slate-600";
      case "sy":
        return "bg-blue-700";
      case "ma":
        return "bg-purple-600";
      case "mu":
        return "bg-orange-700";
      case "yo":
        return "bg-red-700";
      case "sp":
        return "bg-green-700";
      case "so":
        return "bg-pink-700";
      default:
        return "bg-gray-500";
    }
  }, [truncated]);

  return (
    <Avatar className={cn("h-6 w-6 border border-background", bgColorClass)}>
      <AvatarFallback className="text-xs text-white bg-transparent">
        {truncated}
      </AvatarFallback>
    </Avatar>
  );
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  artists: z.string().optional(),
  duration: z.number(),
});

type FormValues = z.infer<typeof formSchema>;

interface SearchLyricsProps {
  title: string;
  artists?: string;
  duration: number;
}

export default function SearchLyrics({
  title,
  artists,
  duration,
}: SearchLyricsProps) {
  const apolloClient = useApolloClient();
  const [searchResults, setSearchResults] = useNamedState<
    LyricsKitLyricsEntry[]
  >([], "searchResults");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: {
      title: title ?? "",
      artists: artists ?? "",
      duration: duration ?? 0,
    },
    resetOptions: {
      keepDefaultValues: true,
    },
  });

  const parsedResults = useMemo(
    () =>
      searchResults.map((v) => {
        try {
          const lyrics = new Lyrics(v.lyrics);
          const analysis = lyricsAnalysis(lyrics);
          return { lyrics, analysis };
        } catch {
          return null;
        }
      }),
    [searchResults]
  );

  const copyText = useCallback(
    (text: string | undefined | null) => async () => {
      if (!text) return;
      navigator.clipboard.writeText(text).then(
        function () {
          toast.success("Copied!");
        },
        function (err) {
          console.error("Could not copy text: ", err);
          toast.error(`Failed to copy: ${err}`);
        }
      );
    },
    []
  );

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const sessionId = `${Math.random()}`;
      setSearchResults([]);

      const query = apolloClient.query<{
        lyricsKitSearch: LyricsKitLyricsEntry[];
      }>({
        query: SEARCH_LYRICS_QUERY,
        variables: {
          ...values,
          sessionId,
        },
        fetchPolicy: "network-only", // Ensure fresh results
      });

      const subscription = apolloClient.subscribe<{
        lyricsKitSearchIncremental: LyricsKitLyricsEntry;
      }>({
        query: SEARCH_LYRICS_PROGRESS_SUBSCRIPTION,
        variables: { sessionId },
      });

      const zenSubscription = subscription.subscribe({
        start(subscription: Subscription) {
          console.log("subscription started", subscription);
        },
        next(x) {
          console.log("subscription event", x);
          if (x.data?.lyricsKitSearchIncremental) {
            setSearchResults((results) => {
              // Avoid duplicates based on lyrics content
              if (
                results.some(
                  (r) => r.lyrics === x.data.lyricsKitSearchIncremental.lyrics
                )
              ) {
                return results;
              }
              const arr = [...results, x.data.lyricsKitSearchIncremental];
              arr.sort((a, b) => b.quality - a.quality);
              return arr;
            });
          }
        },
        error(err) {
          console.log(`Finished with error: ${err}`);
          toast.error(`Subscription error: ${err.message}`);
        },
        complete() {
          console.log("Subscription finished");
        },
      });

      const result = await query;
      zenSubscription.unsubscribe(); // Unsubscribe after query completes

      if (result.data) {
        setSearchResults((currentResults) => {
          const newResults = result.data.lyricsKitSearch.filter(
            (newItem) =>
              !currentResults.some(
                (existing) => existing.lyrics === newItem.lyrics
              )
          );
          const combined = [...currentResults, ...newResults];
          combined.sort((a, b) => b.quality - a.quality);
          return combined;
        });
      }
    } catch (e: any) {
      console.error(`Error while loading search result; ${e}`);
      toast.error(`Failed to load search results: ${e.message || e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col lg:flex-row lg:items-end w-full gap-2"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Song title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="artists"
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormLabel>Artists</FormLabel>
                <FormControl>
                  <Input placeholder="Artist names" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem className="w-full lg:w-36">
                <FormLabel>Duration</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      readOnly
                      disabled
                      {...field}
                      value={field.value || 0} // Ensure value is controlled
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground">
                      sec
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <ProgressButton
            type="submit"
            progress={isSubmitting}
            className="w-full shrink-0 lg:w-auto"
          >
            {isSubmitting && <Loader2 className="animate-spin" />}
            Search
          </ProgressButton>
        </form>
      </Form>
      <div className="mt-4 space-y-2 w-full">
        {searchResults.map((v, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 rounded-md border p-3 pr-16 relative"
          >
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10 rounded-md">
                <AvatarImage src={v.metadata?.artworkURL ?? undefined} />
                <AvatarFallback className="rounded-md">
                  <Music className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              {v.metadata?.source && (
                <div className="absolute -bottom-1 -right-1">
                  <SourceBadge>{v.metadata.source}</SourceBadge>
                </div>
              )}
            </div>
            <div className="flex-grow w-0 overflow-hidden">
              <p className="font-medium truncate">
                {`${v.tags?.ti}` || <em>No title</em>}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {`${v.tags?.ar}` || <em>Various artists</em>} /{" "}
                {`${v.tags?.al}` || <em>Unknown album</em>}
              </p>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {v.lyrics.replace(/\n?\[[^\]]*?]/g, "¶").replace(/^¶+/g, "")}
              </p>
              <InlineAnalysisResult
                result={parsedResults[idx]?.analysis}
                duration={duration}
                length={v.tags?.length as number | undefined}
              />
            </div>
            <div className="absolute top-2 right-2 flex flex-col">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyText(v.lyrics)}
                  >
                    <Copy />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Copy lyrics</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!v.metadata?.artworkURL}
                    onClick={copyText(v.metadata?.artworkURL)}
                  >
                    <Images />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Copy cover URL</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
