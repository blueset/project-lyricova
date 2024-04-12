import data from "./kanjidic2.mod.min.json";
import { kanaToHira } from "lyricova-common/utils/kanaUtils";

// kanjidic2.mod.min.json extracted from KANJIDIC project
// http://www.edrdg.org/wiki/index.php/KANJIDIC_Project
// Licensed CC BY-SA 4.0

const mapping: { [key: string]: string[] } = data;

const dakuon = {
    "か": "が", "き": "ぎ", "く": "ぐ", "け": "げ", "こ": "ご",
    "さ": "ざ", "し": "じ", "す": "ず", "せ": "ぜ", "そ": "ぞ",
    "た": "だ", "ち": "ぢ", "つ": "づ", "て": "で", "と": "ど",
    "は": "ば", "ひ": "び", "ふ": "ぶ", "へ": "べ", "ほ": "ぼ",
};

const handauon = {
    "は": "ぱ", "ひ": "ぴ", "ふ": "ぷ", "へ": "ぺ", "ほ": "ぽ",
};

function patchReading(readings: string[], base: string): string[] {
    const result: string[] = [];
    for (const reading of readings) {
        result.push(reading);
        const hira = kanaToHira(reading);
        // katakana to hiragana
        if (hira !== reading) {
            result.push(hira);
        }
        if (hira.match(/[つくち]$/)) {
            result.push(hira.replace(/[つくち]$/, "っ"));
        }
        if (hira.match(/^[かきくけこさしすせそたちつてとはひふへほ]/)) {
            result.push(hira.replace(/^([かきくけこさしすせそたちつてとはひふへほ])/, (m: keyof typeof dakuon) => dakuon[m]));
        }
        if (hira.match(/^[はひふへほ]/)) {
            result.push(hira.replace(/^([はひふへほ])/, (m: keyof typeof handauon) => handauon[m]));
        }
    }
    // match base itself
    result.push(base);
    // match nothing
    result.push("");
    return result;
}

export function convertMonoruby(base: string, reading: string): [string[], string[]] {
    const baseGroups: string[] = [];
    const readingGroups: string[] = [];
    let i = 0;

    for (const baseChar of base) {
        for (const readingCandid of patchReading(mapping[baseChar] ?? [], baseChar)) {
            if (reading.startsWith(readingCandid, i)) {
                baseGroups.push(baseChar);
                readingGroups.push(readingCandid);
                i += readingCandid.length;
                break;
            }
        }
    }

    if (i < reading.length) {
        return [[base], [reading]];
    }

    return [baseGroups, readingGroups];
}