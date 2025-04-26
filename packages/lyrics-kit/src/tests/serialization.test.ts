import { Lyrics } from "../core/lyrics";
import { LyricsLine } from "../core/lyricsLine";
import {
  Attachments,
  RangeAttribute,
  WordTimeTag,
  PlainText,
  FURIGANA,
  TIME_TAG,
} from "../core/lyricsLineAttachment";
import { ARTIST, TITLE, OFFSET } from "../core/idTagKey";
import { AttachmentJSON } from "../core/attachmentTypes";

describe("Lyrics Kit Serialization", () => {
  test("should serialize and deserialize attachment types correctly", () => {
    // Test PlainText
    const plainText = new PlainText("Hello World");
    const plainTextJson = plainText.toJSON();
    expect(plainTextJson).toEqual({
      type: "plain_text",
      text: "Hello World",
    });
    const deserializedPlainText = PlainText.fromJSON(plainTextJson);
    expect(deserializedPlainText.text).toBe("Hello World");

    // Test WordTimeTag
    const wordTimeTag = new WordTimeTag("<1000,0><2000,1>");
    const wordTimeTagJson = wordTimeTag.toJSON();
    expect(wordTimeTagJson).toEqual({
      type: "time_tag",
      tags: [
        { timeTag: 1, index: 0 },
        { timeTag: 2, index: 1 },
      ],
      duration: undefined,
    });
    const deserializedWordTimeTag = WordTimeTag.fromJSON(wordTimeTagJson);
    expect(deserializedWordTimeTag.tags.length).toBe(2);
    expect(deserializedWordTimeTag.tags[0].timeTag).toBe(1);
    expect(deserializedWordTimeTag.tags[1].timeTag).toBe(2);

    // Test RangeAttribute
    const rangeAttribute = new RangeAttribute("<ruby1,0,2><ruby2,3,5>");
    const rangeAttributeJson = rangeAttribute.toJSON();
    expect(rangeAttributeJson).toEqual({
      type: "range",
      attachment: [
        { content: "ruby1", range: [0, 2] },
        { content: "ruby2", range: [3, 5] },
      ],
    });
    const deserializedRangeAttribute = RangeAttribute.fromJSON(rangeAttributeJson);
    expect(deserializedRangeAttribute.attachment.length).toBe(2);
    expect(deserializedRangeAttribute.attachment[0].content).toBe("ruby1");
    expect(deserializedRangeAttribute.attachment[1].content).toBe("ruby2");
  });

  test("should handle arbitrary attachment keys", () => {
    const attachments = new Attachments();

    // Add custom attachments with different types
    attachments.setTag("custom_plain", "Plain text");
    attachments.setTag(TIME_TAG, "<1000,0><2000,1>");
    attachments.setTag(FURIGANA, "<ruby,0,2>");
    attachments.setTranslation("English text", "en");
    attachments.setTranslation("French text", "fr");

    // Serialize
    const json = attachments.toJSON();

    // Verify JSON structure
    expect(json["custom_plain"]).toEqual({
      type: "plain_text",
      text: "Plain text",
    });
    expect(json[TIME_TAG].type).toBe("time_tag");
    expect(json[FURIGANA].type).toBe("range");
    expect(json["tr:en"].type).toBe("plain_text");
    expect(json["tr:fr"].type).toBe("plain_text");

    // Deserialize
    const deserialized = Attachments.fromJSON(json);

    // Verify all attachments are restored correctly
    expect(deserialized.getTag("custom_plain")).toBe("Plain text");
    expect(deserialized.timeTag.tags.length).toBe(2);
    expect(deserialized.getTag(FURIGANA)).toBe("<ruby,0,2>");
    expect(deserialized.translation("en")).toBe("English text");
    expect(deserialized.translation("fr")).toBe("French text");
  });

  test("should serialize and deserialize complex lyrics object", () => {
    const lyrics = new Lyrics();
    lyrics.idTags[ARTIST] = "Test Artist";
    lyrics.idTags[TITLE] = "Test Song";
    lyrics.idTags[OFFSET] = "1000";

    const line1 = new LyricsLine("Test Line 1", 1.5);
    line1.lyrics = lyrics;
    line1.attachments.setTranslation("Translation 1", "en");
    line1.attachments.setTag(FURIGANA, "<ruby,0,2>");
    line1.attachments.setTag(TIME_TAG, "<1000,0><2000,1>");
    line1.attachments.setTag("custom_tag", "Custom Value");

    const line2 = new LyricsLine("Test Line 2", 3.0);
    line2.lyrics = lyrics;
    line2.enabled = false;
    line2.attachments.setTranslation("Translation 2", "fr");

    lyrics.lines = [line1, line2];

    // Serialize
    const json = lyrics.toJSON();

    // Deserialize
    const deserialized = Lyrics.fromJSON(json);

    // Verify structure
    expect(deserialized.idTags[ARTIST]).toBe("Test Artist");
    expect(deserialized.idTags[TITLE]).toBe("Test Song");
    expect(deserialized.idTags[OFFSET]).toBe("1000");

    // Check first line
    const deserializedLine1 = deserialized.lines[0];
    expect(deserializedLine1.content).toBe("Test Line 1");
    expect(deserializedLine1.position).toBe(1.5);
    expect(deserializedLine1.enabled).toBe(true);
    expect(deserializedLine1.attachments.translation("en")).toBe("Translation 1");
    expect(deserializedLine1.attachments.getTag("custom_tag")).toBe("Custom Value");
    expect(deserializedLine1.attachments.getTag(FURIGANA)).toBe("<ruby,0,2>");
    expect(deserializedLine1.lyrics).toBe(deserialized);

    // Check second line
    const deserializedLine2 = deserialized.lines[1];
    expect(deserializedLine2.content).toBe("Test Line 2");
    expect(deserializedLine2.position).toBe(3.0);
    expect(deserializedLine2.enabled).toBe(false);
    expect(deserializedLine2.attachments.translation("fr")).toBe("Translation 2");
    expect(deserializedLine2.lyrics).toBe(deserialized);
  });

  test("should handle empty or missing attachments", () => {
    const attachments = new Attachments();
    const json = attachments.toJSON();
    expect(Object.keys(json)).toHaveLength(0);

    const deserialized = Attachments.fromJSON(json);
    expect(Object.keys(deserialized.content)).toHaveLength(0);
  });

  test("should maintain type information in JSON format", () => {
    const attachments = new Attachments();
    attachments.setTranslation("Test", "en");

    const json = attachments.toJSON();
    const value = json["tr:en"] as AttachmentJSON;

    expect(value.type).toBe("plain_text");
    expect(Object.keys(json)).toContain("tr:en");
  });
});
