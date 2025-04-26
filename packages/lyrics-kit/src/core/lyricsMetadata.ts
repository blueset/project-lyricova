import { isTranslationTag } from "./lyricsLineAttachment";
import { LyricsProviderSource } from "../service/lyricsProviderSource";
import { LyricsSearchRequest } from "../service/lyricsSearchRequest";
import _ from "lodash";

export interface LyricsMetadataJSON {
  attachmentTags?: string[];
  source?: string;
  request?: object;
  searchIndex?: number;
  remoteURL?: string;
  artworkURL?: string;
  providerToken?: string;
  quality?: number;
  [key: string]: any;
}

export const ATTACHMENT_TAGS = "attachmentTags";
export const SOURCE = "source";
export const REQUEST = "request";
export const SEARCH_INDEX = "searchIndex";
export const REMOTE_URL = "remoteURL";
export const ARTWORK_URL = "artworkURL";
export const PROVIDER_TOKEN = "providerToken";
const QUALITY = "quality";

export class LyricsMetadata {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public data: { [key: string]: any } = {};
  /* Lyrics.Metadata.Key is mapped to string */
  public toString(): string {
    return Object.entries(this)
      .map(v => `[${v[0]}:${v[1]}]`)
      .join("\n");
  }

  public toJSON(): LyricsMetadataJSON {
    const json: LyricsMetadataJSON = {};

    if (this.attachmentTags.size > 0) {
      json.attachmentTags = Array.from(this.attachmentTags);
    }

    if (this.source?.cls?.name) {
      json.source = this.source.cls.name;
    }

    if (this.request) {
      json.request = this.request;
    }

    if (this.searchIndex !== 0) {
      json.searchIndex = this.searchIndex;
    }

    if (this.remoteURL) {
      json.remoteURL = this.remoteURL;
    }

    if (this.artworkURL) {
      json.artworkURL = this.artworkURL;
    }

    if (this.providerToken) {
      json.providerToken = this.providerToken;
    }

    if (this.quality !== undefined) {
      json.quality = this.quality;
    }

    return json;
  }

  public get attachmentTags(): Set<string> {
    return this.data[ATTACHMENT_TAGS] || new Set();
  }
  public set attachmentTags(val: Set<string>) {
    this.data[ATTACHMENT_TAGS] = val;
  }

  public get hasTranslation(): boolean {
    for (const tag of this.attachmentTags) {
      if (isTranslationTag(tag)) return true;
    }
    return false;
  }

  /* Sources/LyricsService/LyricsMetadata+Extension.swift */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public get source(): LyricsProviderSource<any> | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.data[SOURCE] as LyricsProviderSource<any> | undefined;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public set source(val: LyricsProviderSource<any> | undefined) {
    this.data[SOURCE] = val;
  }

  public get request(): LyricsSearchRequest | undefined {
    return this.data[REQUEST] as LyricsSearchRequest | undefined;
  }
  public set request(val: LyricsSearchRequest | undefined) {
    this.data[REQUEST] = val;
  }

  public get searchIndex(): number {
    return (this.data[SEARCH_INDEX] as number) || 0;
  }
  public set searchIndex(val: number) {
    this.data[SEARCH_INDEX] = val;
  }

  public get remoteURL(): string | undefined {
    return this.data[REMOTE_URL] as string | undefined;
  }
  public set remoteURL(val: string | undefined) {
    this.data[REMOTE_URL] = val;
  }

  public get artworkURL(): string | undefined {
    return this.data[ARTWORK_URL] as string | undefined;
  }
  public set artworkURL(val: string | undefined) {
    this.data[ARTWORK_URL] = val;
  }

  public get providerToken(): string | undefined {
    return this.data[PROVIDER_TOKEN] as string | undefined;
  }
  public set providerToken(val: string | undefined) {
    this.data[PROVIDER_TOKEN] = val;
  }

  public get quality(): number | undefined {
    return this.data[QUALITY] as number | undefined;
  }
  public set quality(val: number | undefined) {
    this.data[QUALITY] = val;
  }
  public static fromJSON(json: LyricsMetadataJSON): LyricsMetadata {
    const metadata = new LyricsMetadata();

    if (json.attachmentTags) {
      metadata.attachmentTags = new Set(json.attachmentTags);
    }

    if (json.source) {
      metadata.data[SOURCE] = json.source;
    }

    if (json.request) {
      metadata.data[REQUEST] = json.request;
    }

    if (json.searchIndex !== undefined) {
      metadata.data[SEARCH_INDEX] = json.searchIndex;
    }

    if (json.remoteURL) {
      metadata.data[REMOTE_URL] = json.remoteURL;
    }

    if (json.artworkURL) {
      metadata.data[ARTWORK_URL] = json.artworkURL;
    }

    if (json.providerToken) {
      metadata.data[PROVIDER_TOKEN] = json.providerToken;
    }

    if (json.quality !== undefined) {
      metadata.data[QUALITY] = json.quality;
    }

    return metadata;
  }
}
