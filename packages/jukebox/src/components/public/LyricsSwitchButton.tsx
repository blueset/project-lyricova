import { useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@lyricova/components/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import type { ReactNode } from "react";

interface Props<T extends ReactNode> {
  module: T;
  setModule: (value: T) => void;
  moduleNames: T[];
}

export function LyricsSwitchButton<T extends ReactNode>({
  module,
  setModule,
  moduleNames,
}: Props<T>) {
  const handleSelect = useCallback(
    (option: T) => {
      setModule(option);
    },
    [setModule]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          {module}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {moduleNames.map((v) => (
          <DropdownMenuItem key={`${v}`} onClick={() => handleSelect(v)}>
            {v}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
