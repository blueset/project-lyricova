import * as React from "react";
import Select, { GroupBase, type Props as SelectProps } from "react-select";
import { cn } from "@lyricova/components/utils";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { Button } from "@lyricova/components/components/ui/button";

type MultiSelectProps<
  Option = unknown,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>
> = SelectProps<Option, IsMulti, Group> & {
  size?: "sm" | "default";
};

function MultiSelect<
  Option = unknown,
  IsMulti extends boolean = true,
  Group extends GroupBase<Option> = GroupBase<Option>
>({
  size = "default",
  className,
  ...props
}: MultiSelectProps<Option, IsMulti, Group>) {
  return (
    <Select
      unstyled
      classNames={{
        control: (state) =>
          cn(
            "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            size === "default" ? "min-h-9" : "min-h-8",
            state.isFocused && "border-ring ring-ring/50 ring-[3px]",
            className
          ),
        valueContainer: () => "flex flex-wrap gap-1 py-0.5",
        multiValue: () =>
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
        multiValueLabel: () => "leading-none",
        multiValueRemove: () =>
          "hover:bg-destructive/20 text-destructive dark:text-red-500 dark:hover:text-red-600 rounded-sm p-0.5",
        indicatorsContainer: () => "flex items-center gap-1",
        indicatorSeparator: () => "bg-border self-stretch w-px mx-1",
        dropdownIndicator: () =>
          "text-muted-foreground p-1 hover:text-foreground",
        clearIndicator: () => "text-muted-foreground p-1 hover:text-foreground",
        menu: () =>
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 mt-1 min-w-[8rem] origin-top overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
        menuList: () => "p-1 max-h-60",
        option: (state) =>
          cn(
            "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 px-2 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            state.isFocused && "bg-accent text-accent-foreground",
            state.isSelected && "bg-accent/50 font-semibold"
          ),
        input: () => "text-foreground m-0 p-0",
        placeholder: () => "text-muted-foreground",
        noOptionsMessage: () => "text-muted-foreground p-2 text-sm",
        groupHeading: () =>
          "text-muted-foreground px-2 py-1.5 text-xs font-semibold",
      }}
      components={{
        DropdownIndicator: (props) => (
          <ChevronDownIcon className="size-4 opacity-50" />
        ),
        ClearIndicator: (props) => (
          <Button
            size="icon-xs"
            variant="ghost"
            className="hover:bg-accent dark:hover:bg-accent"
            {...(props.innerProps as unknown as React.JSX.IntrinsicElements["button"])}
          >
            <XIcon className="size-4" />
          </Button>
        ),
        MultiValueRemove: (props) => (
          <Button
            size="icon-xs"
            variant="ghost"
            className="hover:bg-accent dark:hover:bg-accent"
            {...(props.innerProps as unknown as React.JSX.IntrinsicElements["button"])}
          >
            <XIcon className="size-4" />
          </Button>
        ),
      }}
      {...props}
    />
  );
}

export { MultiSelect };
