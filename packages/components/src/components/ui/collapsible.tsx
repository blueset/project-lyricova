import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { Button } from "@lyricova/components/components/ui/button";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  );
}

function CollapsibleToggleButton({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsibleTrigger asChild {...props}>
      <Button variant="ghost" size="icon" className="group/collapse-trigger">
        <ChevronsUpDown className="hidden group-data-[state=closed]/collapse-trigger:block" />
        <ChevronsDownUp className="hidden group-data-[state=open]/collapse-trigger:block" />
      </Button>
    </CollapsibleTrigger>
  );
}

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsibleToggleButton,
};
