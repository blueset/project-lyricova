import { Alert } from "@lyricova/components/components/ui/alert";
import { ComponentProps, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@lyricova/components/utils";

interface Props extends ComponentProps<typeof Alert> {}

export default function DismissibleAlert({
  children,
  className,
  ...props
}: Props) {
  const [open, toggle] = useState(true);
  if (!open) return null;
  return (
    <Alert className={cn("pr-8", className)} {...props}>
      <button
        className="absolute top-2 right-2 rounded-md p-1 text-foreground/50 hover:text-foreground focus:ring-2 w-6 h-6"
        onClick={() => toggle(false)}
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </Alert>
  );
}
