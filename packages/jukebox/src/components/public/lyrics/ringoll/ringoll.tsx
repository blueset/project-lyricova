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
      "size-full relative overflow-clip p-4 px-8 transition-[mask-border-image-width,mask-box-image-width,-webkit-mask-box-image-width] duration-500 ",
      "[mask-border-image-width:5rem_0_30%] [mask-box-image-width:5rem_0_30%] [-webkit-mask-box-image-width:5rem_0_30%]",
      "hover:[mask-border-image-width:5rem_0] hover:[mask-box-image-width:5rem_0] hover:[-webkit-mask-box-image-width:5rem_0]"
    )}
    style={{
      // @ts-expect-error TypeScript doesn't recognize these properties
      maskBorderImageSource:
        "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 49%, rgba(0, 0, 0, 1) 51%, rgba(0, 0, 0, 0) 100%)",
      maskBorderImageSlice: "49% 0 fill",
      maskBoxImageSource:
        "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 49%, rgba(0, 0, 0, 1) 51%, rgba(0, 0, 0, 0) 100%)",
      maskBoxImageSlice: "49% 0 fill",
      // Note: Property name changed for React style object
      WebkitMaskBoxImageSource:
        "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 49%, rgba(0, 0, 0, 1) 51%, rgba(0, 0, 0, 0) 100%)",
      WebkitMaskBoxImageSlice: "49% 0 fill",
    }}
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
