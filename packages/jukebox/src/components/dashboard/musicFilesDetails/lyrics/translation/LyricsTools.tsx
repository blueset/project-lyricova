import { Button } from "@lyricova/components/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@lyricova/components/components/ui/hover-card";
import { CircularProgress } from "@lyricova/components/components/ui/circular-progress";
import { ChevronDownIcon, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLyricsStore } from "../state/editorState";
import { useShallow } from "zustand/shallow";
import { useAuthContext } from "@lyricova/components";
import { fetchEventData } from "fetch-sse";
import { toast } from "sonner";

export default function LyricsTools() {
  const authContext = useAuthContext();
  const { fixQuotes, setTextareaValue } = useLyricsStore(
    useShallow((state) => ({
      fixQuotes: state.translations.fixQuotes,
      setTextareaValue: state.translations.setTextareaValue,
    }))
  );

  const [isAlignmentLoading, setIsAlignmentLoading] = useState(false);
  const [chunkBuffer, setChunkBuffer] = useState<string>("");
  const [reasoningBuffer, setReasoningBuffer] = useState<string>("");
  const reasoningContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const handleAlignment = useCallback(
    (model?: string) => async () => {
      const translation = useLyricsStore.getState().translations.textareaValue;
      const original =
        useLyricsStore
          .getState()
          .lyrics?.lines.map((line) => line.content)
          .join("\n") ?? "";
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
              setTextareaValue(data.aligned);
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
    [authContext, setTextareaValue, isScrolledToBottom]
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

  const progressValue = chunkBuffer
    ? Math.min(
        100,
        Math.max(
          0,
          (chunkBuffer.split("\n").length * 100) /
            (useLyricsStore.getState().lyrics?.lines.length * 4 + 2 || 1)
        )
      )
    : undefined;

  return (
    <div className="flex flex-row">
      <Button variant="ghost" size="sm" onClick={fixQuotes}>
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
              className="p-4 w-auto max-w-[80ch] overflow-y-auto max-h-(--radix-hover-card-content-available-height)"
              side="bottom"
            >
              {reasoningBuffer && (
                <div
                  ref={reasoningContainerRef}
                  className="mt-4 p-4 max-h-16 overflow-y-auto text-muted-foreground italic whitespace-pre-wrap"
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
            "deepseek/deepseek-chat:free",
            "google/gemini-2.5-pro-exp-03-25:free",
            "openai/o4-mini",
            "openai/o3-mini",
            "openai/o1-mini",
            "openai/o1",
            "openai/gpt-4.1-nano",
            "openai/gpt-4.1-mini",
            "openai/gpt-4.1",
            "openai/gpt-4o",
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
  );
}
