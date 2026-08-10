import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lyricova/components/components/ui/collapsible";
import { Button } from "@lyricova/components/components/ui/button";
import { cn } from "@lyricova/components/utils";
import calculateDiff from "fast-diff";
import { ChevronDown } from "lucide-react";
import { useMemo } from "react";

interface Props {
  title: string;
  savedValue: string;
  draftValue: string;
}

export default function RecoveryDraftDiff({
  title,
  savedValue,
  draftValue,
}: Props) {
  const changes = useMemo(
    () => calculateDiff(savedValue, draftValue),
    [draftValue, savedValue],
  );

  if (savedValue === draftValue) return null;

  return (
    <Collapsible className="group/recovery-diff rounded-md border">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between rounded-md font-semibold"
        >
          {title} changes
          <ChevronDown className="transition-transform group-data-[state=open]/recovery-diff:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t p-3">
          <div className="mb-2 flex gap-3 text-xs text-muted-foreground">
            <span className="rounded-sm bg-destructive/15 px-1.5 py-0.5">
              Saved only
            </span>
            <span className="rounded-sm bg-success/15 px-1.5 py-0.5">
              Draft only
            </span>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 font-mono text-xs">
            {changes.map(([operation, text], index) => (
              <span
                key={index}
                className={cn(
                  operation === calculateDiff.DELETE &&
                    "bg-destructive/15 text-destructive line-through",
                  operation === calculateDiff.INSERT &&
                    "bg-success/15 text-success-foreground",
                )}
              >
                {text}
              </span>
            ))}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
