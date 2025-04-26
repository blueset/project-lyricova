import {
  DOTS,
  FURIGANA,
  METADATA_MINOR,
  METADATA_ROLE,
  ROMAJI,
  TAGS,
  TIME_TAG,
  TRANSLATION,
} from "./lyricsLineAttachment";

export interface WordTimeTagLabelJSON {
  timeTag: number;
  index: number;
}

export interface WordTimeTagJSON {
  type: "time_tag";
  tags: WordTimeTagLabelJSON[];
  duration?: number;
}

export interface RangeAttributeLabelJSON {
  content: string;
  range: [number, number];
}

export interface RangeAttributeJSON {
  type: "range";
  attachment: RangeAttributeLabelJSON[];
}

export interface PlainTextJSON {
  type: "plain_text";
  text: string;
}

export type NumberArrayJson = {
  type: "number_array";
  values: number[];
};

export type Number2DArrayJson = {
  type: "number_2d_array";
  values: number[][];
};

export type AttachmentJSON =
  | WordTimeTagJSON
  | RangeAttributeJSON
  | PlainTextJSON
  | NumberArrayJson
  | Number2DArrayJson;

export interface AttachmentsJSON {
  [TIME_TAG]?: WordTimeTagJSON;
  [TRANSLATION]?: PlainTextJSON;
  [translationTag: `${typeof TRANSLATION}:${string}`]: PlainTextJSON;
  [FURIGANA]?: RangeAttributeJSON;
  [ROMAJI]?: RangeAttributeJSON;
  [METADATA_ROLE]?: PlainTextJSON;
  [METADATA_MINOR]?: PlainTextJSON;
  [DOTS]?: NumberArrayJson;
  [TAGS]?: Number2DArrayJson;
  [key: string]: AttachmentJSON;
}
