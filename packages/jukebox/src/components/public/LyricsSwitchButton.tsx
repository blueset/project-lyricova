import { useMemo } from "react";
import { ChevronDown, CircleIcon } from "lucide-react";
import { Button } from "@lyricova/components/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";

export interface MenuEntry<T extends string> {
  /** Stable identifier, persisted and never displayed. */
  value: T;
  label: string;
  /** Labels of the enclosing submenus, outermost first. */
  path?: string[];
}

export type MenuNode<T extends string> =
  | { type: "leaf"; value: T; label: string }
  | { type: "group"; label: string; children: MenuNode<T>[] };

export function buildMenuTree<T extends string>(
  entries: MenuEntry<T>[],
): MenuNode<T>[] {
  const root: MenuNode<T>[] = [];

  for (const entry of entries) {
    let siblings = root;
    for (const segment of entry.path ?? []) {
      let group = siblings.find(
        (node): node is Extract<MenuNode<T>, { type: "group" }> =>
          node.type === "group" && node.label === segment,
      );
      if (!group) {
        group = { type: "group", label: segment, children: [] };
        siblings.push(group);
      }
      siblings = group.children;
    }
    siblings.push({ type: "leaf", value: entry.value, label: entry.label });
  }

  return root;
}

function containsValue<T extends string>(node: MenuNode<T>, value: T): boolean {
  return node.type === "leaf"
    ? node.value === value
    : node.children.some((child) => containsValue(child, value));
}

function renderNodes<T extends string>(nodes: MenuNode<T>[], value: T) {
  return nodes.map((node) =>
    node.type === "leaf" ? (
      <DropdownMenuRadioItem key={`leaf:${node.value}`} value={node.value}>
        {node.label}
      </DropdownMenuRadioItem>
    ) : (
      <DropdownMenuSub key={`group:${node.label}`}>
        <DropdownMenuSubTrigger inset className="relative">
          {containsValue(node, value) && (
            <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
              <CircleIcon className="size-2 fill-current" />
            </span>
          )}
          {node.label}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {renderNodes(node.children, value)}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    ),
  );
}

interface Props<T extends string> {
  items: MenuEntry<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function LyricsSwitchButton<T extends string>({
  items,
  value,
  onChange,
}: Props<T>) {
  const tree = useMemo(() => buildMenuTree(items), [items]);
  const selected = items.find((item) => item.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          title={[...(selected?.path ?? []), selected?.label ?? value].join(
            " / ",
          )}
        >
          {selected?.label ?? value}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as T)}
        >
          {renderNodes(tree, value)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
