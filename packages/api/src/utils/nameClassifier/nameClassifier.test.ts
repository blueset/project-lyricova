import { describe, expect, it, jest } from "@jest/globals";
import { classifyNameLanguage } from "./index.js";
import { alignSegments, nfkcNormalize, phoneticSkeleton } from "./normalize.js";
import { phonotacticClassify, scorePinyin, scoreRomaji } from "./phonotactics.js";
import {
  reconcile,
  romanizeAsJapanese,
  romanizeAsMandarin,
  scoreSimilarity,
} from "./reconciliation.js";

jest.setTimeout(30000);

describe("nameClassifier normalization utilities", () => {
  it("builds a phonetic skeleton for romaji input", () => {
    expect(phoneticSkeleton("Takahiro")).toBe("takahiro");
  });

  it("treats Hepburn and nihon-shiki variants equally", () => {
    expect(phoneticSkeleton("Shoujo")).toBe(phoneticSkeleton("Syoujo"));
  });

  it("normalizes fullwidth characters with NFKC", () => {
    expect(nfkcNormalize("（ｒｙ")).toBe("(ry");
  });

  it("aligns mixed Latin and Han passthrough segments", () => {
    expect(alignSegments("cosMo@BousouP", "cosMo@暴走P")).toEqual([
      {
        roman: "cosMo@",
        original: "cosMo@",
        isCJK: false,
        isPassthrough: true,
        isMetaAnnotation: false,
      },
      {
        roman: "Bousou",
        original: "暴走",
        isCJK: true,
        isPassthrough: false,
        isMetaAnnotation: false,
      },
      {
        roman: "P",
        original: "P",
        isCJK: false,
        isPassthrough: true,
        isMetaAnnotation: false,
      },
    ]);
  });

  it("marks trailing meta-annotations separately", () => {
    expect(alignSegments("Yuezheng Longya (Unknown)", "乐正龙牙")).toEqual([
      {
        roman: "Yuezheng Longya",
        original: "乐正龙牙",
        isCJK: true,
        isPassthrough: false,
        isMetaAnnotation: false,
      },
      {
        roman: "(Unknown)",
        original: "",
        isCJK: false,
        isPassthrough: false,
        isMetaAnnotation: true,
      },
    ]);
  });
});

describe("nameClassifier phonotactics", () => {
  it("scores valid pinyin with high coverage", () => {
    expect(scorePinyin("xiaoming")).toBeGreaterThan(0.9);
  });

  it("scores non-pinyin lower for pinyin coverage", () => {
    expect(scorePinyin("takahiro")).toBeLessThan(0.9);
  });

  it("scores valid romaji with high coverage", () => {
    expect(scoreRomaji("takahiro")).toBeGreaterThan(0.9);
  });

  it("scores non-romaji lower for romaji coverage", () => {
    expect(scoreRomaji("xiaoming")).toBeLessThan(0.9);
  });

  it("classifies ryouko as Japanese", () => {
    expect(phonotacticClassify("ryouko").label).toBe("ja");
  });

  it("classifies yuezheng as Chinese", () => {
    expect(phonotacticClassify("yuezheng").label).toBe("zh");
  });
});

describe("nameClassifier reconciliation", () => {
  it("romanizes Han text as Mandarin pinyin", () => {
    const romanized = romanizeAsMandarin("芮晴");
    expect(romanized).toContain("rui");
    expect(romanized).toContain("qing");
  });

  it("romanizes Han text as Japanese", async () => {
    await expect(romanizeAsJapanese("湊貴大")).resolves.toContain("minato");
  });

  it("scores identical strings with perfect similarity", () => {
    expect(scoreSimilarity("minatotakahiro", "minatotakahiro")).toBe(1);
  });

  it("prefers the Japanese reading for 湊貴大", async () => {
    const result = await reconcile("Minato Takahiro", "湊貴大");
    expect(result.japaneseScore).toBeGreaterThan(0.9);
    expect(result.mandarinScore).toBeLessThan(0.2);
    expect(result.japaneseScore).toBeGreaterThan(result.mandarinScore);
  });
});

describe("classifyNameLanguage", () => {
  it("classifies Minato Takahiro / 湊貴大 as Japanese", async () => {
    await expect(
      classifyNameLanguage("Minato Takahiro", "湊貴大"),
    ).resolves.toMatchObject({
      label: "ja",
    });
  });

  it("classifies Ruiqing / 芮晴 as Chinese", async () => {
    await expect(
      classifyNameLanguage("Ruiqing", "芮晴"),
    ).resolves.toMatchObject({
      label: "zh",
    });
  });

  it("classifies Zi San / 籽三 as Chinese", async () => {
    await expect(classifyNameLanguage("Zi San", "籽三")).resolves.toMatchObject(
      {
        label: "zh",
      },
    );
  });

  it("classifies cosMo@BousouP / cosMo@暴走P as Japanese", async () => {
    await expect(
      classifyNameLanguage("cosMo@BousouP", "cosMo@暴走P"),
    ).resolves.toMatchObject({
      label: "ja",
    });
  });

  it("classifies HachioujiP / 八王子P as Japanese", async () => {
    await expect(
      classifyNameLanguage("HachioujiP", "八王子P"),
    ).resolves.toMatchObject({
      label: "ja",
    });
  });

  it("classifies Yuezheng Longya (Unknown) / 乐正龙牙 as Chinese", async () => {
    await expect(
      classifyNameLanguage("Yuezheng Longya (Unknown)", "乐正龙牙"),
    ).resolves.toMatchObject({
      label: "zh",
    });
  });

  it("classifies Tomohiko Togashi / 富樫寛彦 as Japanese", async () => {
    await expect(
      classifyNameLanguage("Tomohiko Togashi", "富樫寛彦"),
    ).resolves.toMatchObject({
      label: "ja",
    });
  });

  it("classifies Hikarisyuyo / 光収容 as Japanese", async () => {
    await expect(
      classifyNameLanguage("Hikarisyuyo", "光収容"),
    ).resolves.toMatchObject({
      label: "ja",
    });
  });

  it("keeps stage names inconclusive when evidence is weak", async () => {
    const result = await classifyNameLanguage("HACHI", "米津玄師");
    expect(["unknown", "ja"]).toContain(result.label);
  });

  it("allows non-standard romanization to remain inconclusive", async () => {
    const result = await classifyNameLanguage("Kenshi Yonezu", "米津玄師");
    expect(["unknown", "ja"]).toContain(result.label);
  });
});
