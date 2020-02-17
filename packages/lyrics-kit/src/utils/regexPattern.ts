
export const timeTagRegex = /\[([-+]?\d+):(\d+(?:\.\d+)?)\]/g;

/**
 * Resolve time tag
 * @param str time tag
 * @returns array of time intervals (in seconds)
 */
export function resolveTimeTag(str: string): number[] {
    const matches = str.matchAll(timeTagRegex);
    const results = [];
    for (const i of matches) {
        const 
            min = parseFloat(i[1]),
            sec = parseFloat(i[2]);
        results.push(min * 60 + sec);
    }
    return results;
}

export const id3TagRegex = /^(?!\[[+-]?\d+:\d+(?:\.\d+)?\])\[(.+?):(.+)\]$/gm;

export const lyricsLineRegex = /^(\[[+-]?\d+:\d+(?:\.\d+)?\])+(?!\[)([^【\n\r]*)(?:【(.*)】)?/gm;

export const base60TimeRegex = /^\s*(?:(\d+):)?(\d+(?:.\d+)?)\s*$/g;

export const lyricsLineAttachmentRegex = /^(\[[+-]?\d+:\d+(?:\.\d+)?\])+\[(.+?)\](.*)/gm;

export const timeLineAttachmentRegex = /<(\d+,\d+)>/g;

export const timeLineAttachmentDurationRegex = /<(\d+)>/g;

export const rangeAttachmentRegex = /<([^,]+,\d+,\d+)>/g;

export const krcLineRegex = /^\[(\d+),(\d+)\](.*)/gm

export const netEaseInlineTagRegex = /\(0,(\d+)\)([^(]+)(\(0,1\) )?/g;

export const kugouInlineTagRegex = /<(\d+),(\d+),0>([^<]*)/g;

export const ttpodXtrcLineRegex = /^((?:\[[+-]?\d+:\d+(?:\.\d+)?\])+)(?:((?:<\d+>[^<\r\n]+)+)|(.*))$(?:[\r\n]+\[x\-trans\](.*))?/gm;

export const ttpodXtrcInlineTagRegex = /<(\d+)>([^<\r\n]*)/gm;

export const syairSearchResultRegex = /<div class="title"><a href="([^"]+)">/g;

export const syairLyricsContentRegex = /<div class="entry">(.+?)<div/gs;
