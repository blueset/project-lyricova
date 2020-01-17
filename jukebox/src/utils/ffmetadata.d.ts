declare module "ffmetadata" {
  export interface ReadOptions {
    dryRun?: boolean;
    coverPath?: string;
  }
  export interface WriteOptions {
    dryRun?: boolean;
    attachments?: string[];
    id3v1?: boolean;
    "id3v2.3"?: boolean;
  }
  export interface Metadata {
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
  export function read(
    src: string,
    callback: (err?: Error, data?: Metadata) => void
  ): void;
  export function read(
    src: string,
    options: ReadOptions & { dryRun: true },
    callback: Function
  ): string[];
  export function read(
    src: string,
    options: ReadOptions,
    callback: (err?: Error, data?: Metadata) => void
  ): void;

  export function write(
    src: string,
    data: Metadata,
    callback: (err?: Error) => void
  ): void;

  export function write(
    src: string,
    data: Metadata,
    options: WriteOptions & { dryRun: true },
    callback: Function
  ): string[];
  export function write(
    src: string,
    data: Metadata,
    options: WriteOptions,
    callback: (err?: Error) => void
  ): void;
}
