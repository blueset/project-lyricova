import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { RowRendererProps } from "./LyricsVirtualizer";

export function RowRenderer({ row }: RowRendererProps<LyricsKitLyricsLine>) {
    return <div>{row.content}</div>;
}