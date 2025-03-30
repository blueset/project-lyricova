declare module "ffprobe-client" {
  export interface Stream {
    index: number;
    codec_type: "audio" | "video";
    [key: string]: any;
  }
  export interface Tags {
    title?: string;
    artist?: string;
    album?: string;
    "title-sort"?: string;
    "artist-sort"?: string;
    "album-sort"?: string;
    ALBUMSORT?: string; // FLAC
    ARTISTSORT?: string; // FLAC
    TITLESORT?: string;
    [key: string]: string;
  }
  export interface Metadata {
    streams: Stream[];
    format?: {
      filename: string;
      format_name: string;
      format_long_name: string;
      tags: Tags;
      duration: string;
      size: string;
      [key: string]: any;
    };
  }
  export default function ffprobe(target: string): Promise<Metadata>;
  export default function ffprobe(
    target: string,
    config: { path?: string }
  ): Promise<Metadata>;
}
