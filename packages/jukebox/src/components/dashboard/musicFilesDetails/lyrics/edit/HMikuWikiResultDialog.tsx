import { ReactNode, useCallback } from "react";
import { gql, useQuery } from "@apollo/client";
import type { HmikuAtWikiEntry } from "@lyricova/api/graphql/types";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@lyricova/components";
import type { DocumentNode } from "graphql";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lyricova/components/components/ui/dialog";

const HMIKU_LYRICS_QUERY = gql`
  query ($id: String!) {
    hmikuLyrics(id: $id) {
      id
      name
      furigana
      lyrics
    }
  }
` as DocumentNode;

interface Props {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
  articleId?: string;
}

export default function HMikuWikiResultDialog({
  isOpen,
  toggleOpen,
  articleId,
}: Props) {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      toggleOpen(open);
    },
    [toggleOpen]
  );

  const query = useQuery<{ hmikuLyrics: HmikuAtWikiEntry }>(
    HMIKU_LYRICS_QUERY,
    {
      variables: { id: articleId || "" },
      skip: !isOpen || !articleId, // Skip query if dialog is not open or no articleId
    }
  );

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied!");
    } catch (err) {
      console.error("Could not copy text: ", err);
      toast.error(`Failed to copy: ${err}`);
    }
  }, []);

  let title: ReactNode = "Loading...";
  let description: ReactNode = null;
  let content: ReactNode = null;

  if (query.error) {
    title = "Error";
    description = `Error occurred while loading lyrics: ${query.error.message}`;
  } else if (query.data) {
    if (!query.data.hmikuLyrics) {
      title = "Not Found";
      description = `Article #${articleId} is not found.`;
    } else {
      const data = query.data.hmikuLyrics;
      title = (
        <div className="flex items-center justify-between">
          <span>
            <Link
              href={`https://w.atwiki.jp/hmiku/pages/${data.id}.html`}
              target="_blank"
              className="hover:underline"
            >
              {data.name}
            </Link>{" "}
            <small className="text-muted-foreground">
              ({data.furigana}, #{data.id})
            </small>
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy lyrics"
            onClick={() => copyText(data.lyrics)}
          >
            <Copy />
          </Button>
        </div>
      );
      description = null; // No separate description needed when title is complex
      content = (
        <pre className="mt-2 max-h-[60vh] overflow-y-auto rounded-md bg-muted p-4 font-mono text-sm">
          {data.lyrics}
        </pre>
      );
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] grid-rows-[auto_1fr_auto]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {content}
        <DialogFooter>
          <Button variant="outline" onClick={() => toggleOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
