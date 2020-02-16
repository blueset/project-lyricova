import { isTranslationTag } from "./lyricsLineAttachment";
import { LyricsProviderSource } from "../service/lyricsProviderSource";
import { LyricsSearchRequest } from "../service/lyricsSearchRequest";

export const ATTACHMENT_TAGS = "attachmentTags";
export const SOURCE = "source";
export const REQUEST = "request";
export const SEARCH_INDEX = "searchIndex";
export const REMOTE_URL = "remoteURL";
export const ARTWORK_URL = "artworkURL";
export const PROVIDER_TOKEN = "providerToken";
const QUALITY = "quality";

export class LyricsMetadata {
    public data: {[key: string]: any} = {};
    /* Lyrics.Metadata.Key is mapped to string */
    public toString(): string {
        return Object
            .entries(this)
            .map(v => `[${v[0]}:${v[1]}]`)
            .join("\n");
    }

    public get attachmentTags(): Set<string> {
        return this.data[ATTACHMENT_TAGS] || new Set();
    }
    public set attachmentTags(val: Set<string>) {
        this.data[ATTACHMENT_TAGS] = val;
    }

    public get hasTranslation(): boolean {
        for (const tag in this.attachmentTags) {
            if (isTranslationTag(tag)) return true;
        }
        return false;
    }

    /* Sources/LyricsService/LyricsMetadata+Extension.swift */

    public get source(): LyricsProviderSource<any> | undefined { 
        return this.data[SOURCE] as LyricsProviderSource<any> | undefined;
    }
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
        return this.data[SEARCH_INDEX] as number || 0;
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
}