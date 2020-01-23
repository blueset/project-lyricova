declare module "mecab-async" {

  import { ExecOptions } from "child_process";

  export interface ParsedEntry {
    kanji: string;
    lexical: string;
    compound: string;
    compound2: string;
    compound3: string;
    conjugation: string;
    inflection: string;
    original: string;
    reading: string;
    pronunciation: string;
  }

  export default class MeCab<T = ParsedEntry> {
    public command: string;
    public options: ExecOptions;

    public parser(data: string[]): T;

    public parse(str: string, callback: (err: Error, result: string[][]) => void): void;
    public parseSync(str: string): string[][];
    public wakachi(str: string, callback: (err: Error, result: string[]) => void): void;
    public wakachiSync(str: string): string[];
    public parseFormat(str: string, callback: (err: Error, result: T[]) => void): void;
    public parseFormatSync(str: string): T[];

  }
}