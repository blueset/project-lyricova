import type { LyricsKitLyrics } from "@lyricova/api/graphql/types";
import { LyricsVirtualizer } from "../components/LyricsVirtualizer";
import { RowRenderer } from "./RowRenderer";
import type { ComponentProps } from "react";
import { cn } from "@lyricova/components/utils";

const RingollContainerDiv = (props: ComponentProps<"div">) => (
  <div
    {...props}
    // Apply Tailwind classes for basic layout and padding
    // Keep complex mask and transition properties as inline styles
    // Attempt hover effect using arbitrary variants (may need adjustment)
    className={cn(
      "relative p-4 px-8 size-full overflow-clip transition-[mask-image,var(--tw-mask-bottom-from-position)] duration-0",
      "mask-t-from-[calc(100%_-_5em)] mask-t-to-100% mask-b-from-70% mask-b-to-100%",
      "hover:mask-b-from-100%"
    )}
    style={{}}
  />
);

interface Props {
  lyrics: LyricsKitLyrics;
  transLangIdx: number;
}

/** Lyricova’s own implementation of scrollable lyrics based on the architecture of AMLL. */
export function RingollLyrics({ lyrics, transLangIdx }: Props) {
  const lang = lyrics.translationLanguages[transLangIdx];
  return (
    <LyricsVirtualizer
      rows={lyrics.lines}
      estimatedRowHeight={20}
      containerAs={RingollContainerDiv} // Use the new functional component
      align="start"
      alignAnchor={0.1}
    >
      {(props) =>
        props.row && (
          <RowRenderer key={props.row.position} transLang={lang} {...props} />
        )
      }
    </LyricsVirtualizer>
  );
}
