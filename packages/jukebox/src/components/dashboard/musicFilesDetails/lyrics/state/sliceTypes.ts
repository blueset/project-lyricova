import type { LyricsJSON } from "lyrics-kit";

export interface MainSlice {
  lrcx: string;
  lrc: string;
  parseError?: string;
  lyrics?: LyricsJSON;
  setLrcx: (lrcx: string) => void;
  setLrc: (lrc: string) => void;
  parse: () => void;
  generate: () => string;
  debouncedParse: () => void;
  debouncedGenerate: () => void;
}

export interface TaggingCurrentLineState {
  index: number;
  start: number;
  end: number;
}

export interface TaggingSlice {
  tagging: {
    cursor: number;
    currentLine: TaggingCurrentLineState;
    isInExtrapolateMode: boolean;
    extrapolateTags: (number | null)[];
    linearRegressionResult?: {
      m: number;
      b: number;
    };
    setTimestampAtCursor: (timestamp: number) => void;
    setExtrapolateTagsAtCursor: (value: number | null) => void;
    setCursor: (cursor: number) => void;
    setCurrentLine: (line: TaggingCurrentLineState) => void;
    setIsInExtrapolateMode: (isInExtrapolateMode: boolean) => void;
    applyExtrapolation: () => void;
    reset: () => void;
  };
}

export interface TranslationSlice {
  translations: {
    selectedLanguage?: string;
    selectedLanguageIndex: number;
    textareaValue: string;
    languages: (string | undefined)[];
    setSelectedLanguage: (language?: string) => void;
    setTextareaValue: (value: string) => void;
    renameSelectedLanguage: (newName: string) => void;
    removeLanguageByIndex: (index: number) => void;
    fixQuotes: () => void;
  };
}

export interface FuriganaSlice {
  furigana: {
    selectedLine?: number;
    autoApplyIdentical: boolean;
    romajiMatching: [number, string][][];
    vocaDbFuriganaLines: string[];
    setSelectedLine: (line: number) => void;
    setAutoApplyIdentical: (value: boolean) => void;
    setVocaDbFuriganaLines: (lines: string[]) => void;
    refreshRomajiMatching: () => void;
    setFurigana: (data: [string, string][][]) => void;
    applyIdenticalFurigana: (sourceIndex: number) => void;
    addFuriganaToSelectedLine: (
      start: number,
      end: number,
      furigana: string
    ) => void;
    removeFuriganaFromSelectedLine: (start: number, end: number) => void;
    applyPatternToAllLines: (base: string, furigana: string) => void;
  };
}

export interface RoleSlice {
  role: {
    selectedLines: number[];
    setSelectedLines: (lines: number[]) => void;
    setRoleByIndex: (index: number | number[], role: number) => void;
    setMinorByIndex: (index: number | number[], minor: boolean) => void;
    setRoleOfSelectedLines: (role: number) => void;
    setMinorOfSelectedLines: (minor: boolean) => void;
  };
}

export interface InlineTaggingCurrentLineState {
  indices: number[];
  start: number;
  end: number;
  borderIndex: number;
}

export interface InlineTaggingSlice {
  inlineTagging: {
    cursorPosition: [number, number];
    dotCursorPosition: [number, number, number];
    currentLine: InlineTaggingCurrentLineState;
    autoApplyIdentical: boolean;
    setCursorPosition: (position: [number, number]) => void;
    setDotCursorPosition: (position: [number, number, number]) => void;
    setCurrentLine: (line: InlineTaggingCurrentLineState) => void;
    moveCursorUp: () => void;
    moveCursorDown: () => void;
    moveCursorLeft: () => void;
    moveCursorRight: () => void;
    moveDotCursorUp: () => void;
    moveDotCursorDown: () => void;
    moveDotCursorLeft: () => void;
    moveDotCursorRight: () => void;
    setDot: () => void;
    setHoldDot: () => void;
    dropDot: () => void;
    setMark: (time: number) => void;
    dropMark: (seek?: (time: number) => void) => void;
    populateDotsAndMarks: () => void;
    updateTimeTags: () => void;
    applyMarksToIdenticalLines: (index: number) => void;
    setDots: (dots: number[][]) => void;
    setAutoApplyIdentical: (value: boolean) => void;
  };
}

export interface LyricsState
  extends MainSlice,
    TaggingSlice,
    TranslationSlice,
    FuriganaSlice,
    RoleSlice,
    InlineTaggingSlice {}
