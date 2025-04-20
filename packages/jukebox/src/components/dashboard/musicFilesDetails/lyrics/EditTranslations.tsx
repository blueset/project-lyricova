import { AlertDescription } from "@lyricova/components/components/ui/alert";
import { Button } from "@lyricova/components/components/ui/button";
import { Input } from "@lyricova/components/components/ui/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lyricova/components/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import { cn } from "@lyricova/components/utils";
import DismissibleAlert from "../../DismissibleAlert";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lyrics } from "lyrics-kit/core";
import { toast } from "sonner";
import { PlusIcon, ChevronDownIcon, X } from "lucide-react";
import { smartypantsu } from "smartypants";
import { gql, useQuery } from "@apollo/client";
import { useAuthContext } from "@lyricova/components";
import { fetchEventData } from "fetch-sse";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { CircularProgress } from "@lyricova/components/components/ui/circular-progress";
import type { VocaDBLyricsEntry } from "@lyricova/api/graphql/types";
import { useNamedStateWithRef } from "@/hooks/useNamedStateWithRef";
import { Textarea } from "@lyricova/components/components/ui/textarea";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@lyricova/components/components/ui/hover-card";
const VOCADB_LYRICS_QUERY = gql`
  query ($id: Int!) {
    vocaDBLyrics(id: $id) {
      id
      translationType
      cultureCodes
      source
      url
      value
    }
  }
`;

interface Props {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  songId: number;
}

export default function EditTranslations({ lyrics, setLyrics, songId }: Props) {
  const authContext = useAuthContext();

  const [isAlignmentLoading, setIsAlignmentLoading] = useState(false);

  const parsedLyrics = useMemo<Lyrics | null>(() => {
    if (!lyrics) return null;
    try {
      return new Lyrics(lyrics);
    } catch (e) {
      console.error(`Error while loading lyrics text: ${e}`, e);
      toast.error(`Error while loading lyrics text: ${e}`);
      return null;
    }
  }, [lyrics]);

  const [languages, setLanguages, languagesRef] = useNamedStateWithRef<
    (string | undefined)[]
  >([], "languages");
  const [currentLanguageIdx, setCurrentLanguageIdx, currentLanguageIdxRef] =
    useNamedStateWithRef<number>(0, "currentLanguageIdx");
  const currentLanguage = useMemo(() => {
    return languages[currentLanguageIdx] || undefined;
  }, [currentLanguageIdx, languages]);

  const [translatedLines, setTranslatedLines, translatedLinesRef] =
    useNamedStateWithRef<(string | null)[]>([], "translatedLines");

  const { data: vocaDBTranslationsData } = useQuery<{
    vocaDBLyrics: VocaDBLyricsEntry[];
  }>(VOCADB_LYRICS_QUERY, {
    variables: { id: songId },
  });

  const vocaDBTranslations = (
    vocaDBTranslationsData?.vocaDBLyrics || []
  ).filter((translation) => translation.translationType === "Translation");

  // Build `translatedLines`.
  useEffect(() => {
    if (parsedLyrics) {
      const languages = parsedLyrics.translationLanguages;
      setLanguages(languages);
      const defaultLanguage = languages[0] || undefined;
      setCurrentLanguageIdx(0);

      const lines = parsedLyrics.lines.map(
        (v) => v?.attachments?.translation(defaultLanguage) ?? null
      );
      setTranslatedLines(lines);
    } else {
      setTranslatedLines([]);
    }

    return () => {
      if (parsedLyrics) {
        const translatedLines = translatedLinesRef.current;
        parsedLyrics.lines.forEach((v, idx) => {
          v.attachments.setTranslation(
            translatedLines[idx],
            languagesRef.current[currentLanguageIdxRef.current]
          );
        });
        setLyrics(parsedLyrics.toString());
      }
    };
  }, [
    setLyrics,
    setTranslatedLines,
    setCurrentLanguageIdx,
    setLanguages,
    translatedLinesRef,
    languagesRef,
    currentLanguageIdxRef,
  ]);

  useEffect(() => {
    if (parsedLyrics) {
      const currentLanguage =
        languagesRef.current[currentLanguageIdxRef.current];
      const lines = parsedLyrics.lines.map(
        (v) => v?.attachments?.translation(currentLanguage) ?? null
      );
      setTranslatedLines(lines);
    }
  }, [currentLanguage, parsedLyrics, setTranslatedLines]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setTranslatedLines(event.target.value.split("\n"));
    },
    [setTranslatedLines]
  );

  const handleLanguageChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setLanguages((languages) => {
        const newLanguages = [...languages];
        const oldLang = newLanguages[currentLanguageIdx];
        const newLang = event.target.value;
        newLanguages[currentLanguageIdx] = newLang;
        parsedLyrics?.lines.forEach((v, idx) => {
          v.attachments.setTranslation(translatedLines[idx], newLang);
          v.attachments.setTranslation(null, oldLang);
        });
        return newLanguages;
      });
    },
    [currentLanguageIdx, parsedLyrics, setLanguages, setLyrics, translatedLines]
  );

  const handleLanguageSwitch = useCallback(
    (value: string) => {
      if (value === null) return;
      // commit current language translations
      const translatedLines = translatedLinesRef.current;
      parsedLyrics?.lines.forEach((v, idx) => {
        v.attachments.setTranslation(translatedLines[idx], currentLanguage);
      });
      setLyrics(parsedLyrics.toString());
      setCurrentLanguageIdx(parseInt(value));
    },
    [currentLanguage, parsedLyrics, setCurrentLanguageIdx, setLyrics]
  );

  const handleDeleteLanguage = useCallback(
    (idx: number) => (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();

      setLanguages((languages) => {
        const newLanguages = [...languages];
        const deletedLang = newLanguages.splice(idx, 1)[0];
        setCurrentLanguageIdx((idx) => Math.min(idx, newLanguages.length - 1));

        parsedLyrics?.lines.forEach((v, idx) => {
          v.attachments.setTranslation(null, deletedLang);
        });
        setLyrics(parsedLyrics.toString());
        return newLanguages;
      });
    },
    [setCurrentLanguageIdx, setLanguages]
  );

  const handleAddLanguage = useCallback(() => {
    setLanguages((languages) => {
      setCurrentLanguageIdx(languages.length);
      return [...languages, `lang-${languages.length}`];
    });
  }, [setCurrentLanguageIdx, setLanguages]);

  const handleFixQuotes = useCallback(() => {
    setTranslatedLines((lines) => {
      try {
        return lines.map((line) => {
          return typeof line === "string" ? smartypantsu(line) : line;
        });
      } catch (e) {
        toast.error(`Error while applying rules: ${e}`);
        console.error(e);
        return lines;
      }
    });
  }, [setTranslatedLines]);

  const [chunkBuffer, setChunkBuffer] = useState<string>("");
  const [reasoningBuffer, setReasoningBuffer] = useState<string>("");
  const reasoningContainerRef = useRef<HTMLDivElement>(null);

  const isScrolledToBottom = useCallback(() => {
    const container = reasoningContainerRef.current;
    if (!container) return false;
    return (
      Math.abs(
        container.scrollHeight - container.clientHeight - container.scrollTop
      ) < 1
    );
  }, []);

  useEffect(() => {
    if (reasoningContainerRef.current && isScrolledToBottom()) {
      reasoningContainerRef.current.scrollTop =
        reasoningContainerRef.current.scrollHeight;
    }
  }, [reasoningBuffer, isScrolledToBottom]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const handleAlignment = useCallback(
    (model?: string) => async () => {
      const translation = translatedLines.join("\n");
      const original =
        parsedLyrics?.lines.map((v) => v.content).join("\n") || "";
      setIsAlignmentLoading(true);
      setChunkBuffer("");
      setReasoningBuffer("");
      try {
        const token = authContext.jwt();
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;
        await fetchEventData("/api/llm/translation-alignment", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: { translation, original, model },
          signal,
          onMessage: (event) => {
            const data = JSON.parse(event.data);
            if (data.error) {
              console.error(data.error);
              toast.error(`Error while aligning: ${data.error}`);
              setIsAlignmentLoading(false);
            } else if (data.aligned) {
              setTranslatedLines(data.aligned.split("\n"));
            } else if (data.chunk) {
              setChunkBuffer((prev) => prev + data.chunk);
            } else if (data.reasoning) {
              const wasScrolledToBottom = isScrolledToBottom();
              setReasoningBuffer((prev) => {
                const newValue = prev + data.reasoning;
                if (wasScrolledToBottom && reasoningContainerRef.current) {
                  setTimeout(() => {
                    reasoningContainerRef.current?.scrollTo(
                      0,
                      reasoningContainerRef.current.scrollHeight
                    );
                  }, 0);
                }
                return newValue;
              });
            }
          },
          onClose: () => {
            toast.success("Alignment completed");
          },
          onError: (error) => {
            if (error === "User canceled the request") {
              toast.info("Alignment canceled");
              return;
            }
            console.error(error);
            toast.error(`Error while aligning: ${error}`);
            setIsAlignmentLoading(false);
          },
        });
      } catch (e) {
        toast.error(`Error while aligning: ${e}`);
        return;
      } finally {
        setIsAlignmentLoading(false);
      }
    },
    [
      authContext,
      parsedLyrics?.lines,
      setTranslatedLines,
      translatedLines,
      isScrolledToBottom,
    ]
  );
  const handleCancelAlignment = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort("User canceled the request");
      abortControllerRef.current = null;
    }
    setIsAlignmentLoading(false);
    setChunkBuffer("");
    setReasoningBuffer("");
  }, []);

  const handleImportTranslation = useCallback(
    (translation: VocaDBLyricsEntry) => {
      const lines = translation.value.split("\n");
      setLanguages((languages) => {
        let newLanguage = translation.cultureCodes?.[0] || "lang";
        let idx = 0;
        while (languages.includes(newLanguage)) {
          newLanguage = `${newLanguage}-${++idx}`;
        }
        const newLanguages = [...languages, newLanguage];
        setCurrentLanguageIdx(newLanguages.length - 1);
        parsedLyrics?.lines.forEach((v, idx) => {
          v.attachments.setTranslation(lines[idx], newLanguage);
        });
        setLyrics(parsedLyrics.toString());
        setTranslatedLines(lines);
        return newLanguages;
      });
    },
    [
      parsedLyrics,
      setLanguages,
      setCurrentLanguageIdx,
      setLyrics,
      setTranslatedLines,
    ]
  );

  const progressValue = chunkBuffer
    ? Math.min(
        100,
        Math.max(
          0,
          (chunkBuffer.split("\n").length * 100) /
            (parsedLyrics.lines.length * 4 + 2)
        )
      )
    : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="col-span-full">
        <div className="flex flex-col gap-2">
          <DismissibleAlert variant="warning">
            <AlertDescription>
              Switch to another tab to save changes.
            </AlertDescription>
          </DismissibleAlert>
          <div className="flex flex-wrap items-center gap-4">
            <Input
              type="text"
              placeholder="Language"
              value={currentLanguage || ""}
              onChange={handleLanguageChange}
              className="w-24"
            />
            <span>Translations:</span>
            <div className="flex flex-row">
              <ToggleGroup
                type="single"
                variant="outline"
                value={currentLanguageIdx.toString()}
                onValueChange={handleLanguageSwitch}
              >
                {languages.map((v, idx) => (
                  <div key={idx} className="relative">
                    <ToggleGroupItem
                      value={idx.toString()}
                      size="sm"
                      className="flex items-center gap-2 pr-8"
                    >
                      #{idx} ({v || "Unknown"})
                    </ToggleGroupItem>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDeleteLanguage(idx)}
                      className="h-6 w-6 absolute right-1 top-1 hover:border border-border"
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </ToggleGroup>
              <Button variant="ghost" size="icon" onClick={handleAddLanguage}>
                <PlusIcon />
              </Button>
            </div>
            <div className="flex flex-row">
              <Button variant="ghost" size="sm" onClick={handleFixQuotes}>
                Fix quotes
              </Button>
              <DropdownMenu>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="flex flex-row gap-2">
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isAlignmentLoading}
                          className="flex items-center gap-2"
                        >
                          LLM Alignment
                          {isAlignmentLoading ? (
                            <CircularProgress
                              size={16}
                              value={progressValue ?? undefined}
                            />
                          ) : (
                            <ChevronDownIcon />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      {isAlignmentLoading && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCancelAlignment}
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                  </HoverCardTrigger>
                  {(chunkBuffer || reasoningBuffer) && (
                    <HoverCardContent
                      className="w-auto max-w-[80ch] max-h-(--radix-hover-card-content-available-height) overflow-y-auto p-4"
                      side="bottom"
                    >
                      {reasoningBuffer && (
                        <div
                          ref={reasoningContainerRef}
                          className="max-h-16 overflow-y-auto p-4 mt-4 italic text-muted-foreground whitespace-pre-wrap"
                        >
                          {reasoningBuffer}
                        </div>
                      )}
                      <pre>{chunkBuffer || "…"}</pre>
                    </HoverCardContent>
                  )}
                </HoverCard>

                <DropdownMenuContent>
                  {[
                    "openai/o1-mini",
                    "deepseek/deepseek-chat:free",
                    "openai/o1",
                    "openai/gpt-4o",
                    "openai/o3-mini",
                    "google/gemma-3-27b-it:free",
                    "meta-llama/llama-3.1-70b-instruct:free",
                    "qwen/qwq-32b:free",
                    "qwen/qwen-2.5-72b-instruct:free",
                    "meta-llama/llama-3.3-70b-instruct:free",
                  ].map((model) => (
                    <DropdownMenuItem
                      key={model}
                      disabled={isAlignmentLoading}
                      onSelect={() => handleAlignment(model)()}
                    >
                      {model}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <span>VocaDB:</span>
            <div className="flex flex-wrap">
              {vocaDBTranslations.map((translation) => (
                <Tooltip key={translation.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="min-w-0"
                      size="sm"
                      onClick={() => handleImportTranslation(translation)}
                    >
                      {translation.cultureCodes?.join(", ")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>
                      {translation.cultureCodes?.join(", ")} –{" "}
                      {translation.source}
                      <br />
                      {translation.value.substring(0, 100)}…
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="">
        <div className="text-xs uppercase text-muted-foreground mb-2">
          Preview
        </div>
        {parsedLyrics?.lines.map((v, idx) => (
          <div key={idx} className="text-sm leading-relaxed">
            <span
              className={cn(
                v.content.trim() && !translatedLines[idx]
                  ? "text-error-foreground"
                  : "text-muted-foreground"
              )}
              lang="ja"
            >
              {v.content}
            </span>
            <span className="text-muted-foreground/50"> ✲ </span>
            <span
              className={cn(
                translatedLines[idx] && !v.content.trim()
                  ? "text-error-foreground"
                  : "text-foreground"
              )}
              lang={currentLanguage || "zh"}
            >
              {translatedLines[idx]}
            </span>
          </div>
        ))}
      </div>
      <div>
        <div className="text-xs uppercase text-muted-foreground mb-2">
          Translations
        </div>
        <Textarea
          id="translations"
          placeholder="Translations"
          value={translatedLines.join("\n")}
          onChange={handleChange}
          autoResize
          className="text-sm leading-relaxed"
          lang={currentLanguage || "zh"}
        />
      </div>
    </div>
  );
}
