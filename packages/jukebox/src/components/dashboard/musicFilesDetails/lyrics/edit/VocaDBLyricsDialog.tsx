import { useCallback } from "react";
import { gql, useQuery } from "@apollo/client";
import type { VocaDBLyricsEntry } from "@lyricova/api/graphql/types";
import { Link } from "@lyricova/components";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lyricova/components/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { toast } from "sonner";
import { Copy } from "lucide-react";

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
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
  songId?: number;
}

export default function VocaDBLyricsDialog({
  isOpen,
  toggleOpen,
  songId,
}: Props) {
  const handleClose = useCallback(() => {
    toggleOpen(false);
  }, [toggleOpen]);

  const query = useQuery<{ vocaDBLyrics: VocaDBLyricsEntry[] }>(
    VOCADB_LYRICS_QUERY,
    {
      variables: { id: songId },
      skip: !isOpen || !songId, // Skip query if dialog is not open or songId is missing
    }
  );

  const copyText = useCallback(
    (text: string) => async () => {
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

  let content = <DialogDescription>Loading...</DialogDescription>;
  if (query.error) {
    content = (
      <DialogDescription className="text-destructive">
        Error occurred while loading lyrics: {`${query.error}`}
      </DialogDescription>
    );
  } else if (query.data) {
    if (query.data.vocaDBLyrics.length < 1) {
      content = (
        <DialogDescription>
          No lyrics found form VocaDB.{" "}
          {songId && (
            <Link
              href={`https://vocadb.net/S/${songId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Contribute one?
            </Link>
          )}
        </DialogDescription>
      );
    } else {
      content = (
        <div className="space-y-4 max-h-96 overflow-y-auto pb-0.5">
          {query.data.vocaDBLyrics.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex-1 overflow-hidden mr-2">
                <p className="text-sm font-medium">
                  {v.translationType} ({v.cultureCodes?.join(", ") || "Unknown"}
                  {v.source && (
                    <>
                      ,{" "}
                      <Link
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {v.source}
                      </Link>
                    </>
                  )}
                  )
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {v.value}
                </p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyText(v.value)}
                      aria-label="Copy lyrics"
                    >
                      <Copy />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy lyrics</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={toggleOpen}>
      <DialogContent className="sm:max-w-[625px] grid-rows-[auto_1fr_auto]">
        <DialogHeader>
          <DialogTitle>Retrieve lyrics from VocaDB</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
