
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

/**
 * Build a time tag from a timestamp.
 * @param position Number of seconds.
 * @returns time tag without bracket.
 * @example
 * buildTimeTag(1.25); // returns "00:01.250"
 * buildTimeTag(121.9423); // returns "02:01.942"
 */
export function buildTimeTag(position: number): string {
    const
      min = Math.floor(position / 60),
      sec = position - min * 60;
    return `${min.toString().padStart(2, "0")}:${sec.toFixed(3).padStart(6, "0")}`;
}

export const id3TagRegex = /^(?!\[[+-]?\d+:\d+(?:\.\d+)?\])\[(.+?):(.+)\]$/gm;

export const lyricsLineRegex = /^(\[[+-]?\d+:\d+(?:\.\d+)?\])+(?!\[)([^\n\r]*?)(?:【([^【】]*)】)?$/gm;

export const base60TimeRegex = /^\s*(?:(\d+):)?(\d+(?:.\d+)?)\s*$/;

export const lyricsLineAttachmentRegex = /^(\[[+-]?\d+:\d+(?:\.\d+)?\])+\[(.+?)\](.*)/gm;

export const timeLineAttachmentRegex = /<(\d+,\d+)>/g;

export const timeLineAttachmentDurationRegex = /<(\d+)>/;

export const rangeAttachmentRegex = /<([^,]+,\d+,\d+)>/g;

export const krcLineRegex = /^\[(\d+),(\d+)\](.*)/gm;

export const netEaseInlineTagRegex = /\(0,(\d+)\)([^(]+)(\(0,1\) )?/g;

export const kugouInlineTagRegex = /<(\d+),(\d+),0>([^<]*)/g;

export const ttpodXtrcLineRegex = /^((?:\[[+-]?\d+:\d+(?:\.\d+)?\])+)(?:((?:<\d+>[^<\r\n]+)+)|(.*))$(?:[\r\n]+\[x\-trans\](.*))?/gm;

export const ttpodXtrcInlineTagRegex = /<(\d+)>([^<\r\n]*)/gm;

export const syairSearchResultRegex = /<div class="title"><a href="([^"]+)">/g;

export const syairLyricsContentRegex = /<div class="entry">(.+?)<div/gs;
