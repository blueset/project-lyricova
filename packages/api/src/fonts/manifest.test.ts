import { describe, expect, it } from "vitest";

import { FONT_IDS, FONT_MANIFEST, getFontManifestEntry } from "./manifest.js";

describe("FONT_MANIFEST", () => {
  it("only lists the api-owned raw SFNT glyph chain, never Jukebox WOFF2 assets", () => {
    const ids = FONT_MANIFEST.map((entry) => entry.id).sort();
    expect(ids).toEqual(
      [
        "inter-variable-ttf",
        "mona-sans-latin-otf",
        "noto-sans-thai-vf-ttf",
        "source-han-sans-vf-otf",
        "source-han-sans-jp-vf",
        "source-han-sans-sc-vf",
        "source-han-sans-tc-vf",
      ].sort(),
    );
  });

  it("never references a WOFF file", () => {
    for (const entry of FONT_MANIFEST) {
      expect(entry.fileName.toLowerCase()).not.toMatch(/\.woff2?$/);
      expect(entry.contentType).toMatch(/^font\/(otf|ttf)$/);
    }
  });

  it("marks every entry as raw SFNT (rawSfnt: true)", () => {
    for (const entry of FONT_MANIFEST) {
      expect(entry.rawSfnt).toBe(true);
    }
  });

  it("marks the full VF and all region subsets as non-eager, everything else eager", () => {
    const eagerness = Object.fromEntries(
      FONT_MANIFEST.map((entry) => [entry.id, entry.eagerFetch]),
    );
    expect(eagerness).toEqual({
      "inter-variable-ttf": true,
      "mona-sans-latin-otf": true,
      "noto-sans-thai-vf-ttf": true,
      "source-han-sans-vf-otf": false,
      "source-han-sans-jp-vf": false,
      "source-han-sans-sc-vf": false,
      "source-han-sans-tc-vf": false,
    });
  });

  it("preserves the full metadata shape for every entry", () => {
    for (const entry of FONT_MANIFEST) {
      expect(entry).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          fileName: expect.any(String),
          contentType: expect.any(String),
          family: expect.any(String),
          script: expect.stringMatching(
            /^(latin|japanese|han-latin|thai|simplified-chinese|traditional-chinese)$/,
          ),
          rawSfnt: expect.any(Boolean),
          eagerFetch: expect.any(Boolean),
        }),
      );
    }
  });

  it("FONT_IDS mirrors FONT_MANIFEST order", () => {
    expect(FONT_IDS).toEqual(FONT_MANIFEST.map((entry) => entry.id));
  });

  it("getFontManifestEntry resolves whitelisted ids and rejects unknown ones", () => {
    expect(getFontManifestEntry("inter-variable-ttf")?.family).toBe(
      "Inter Variable",
    );
    expect(getFontManifestEntry("mona-sans-latin-otf")?.family).toBe(
      "Mona Sans VF",
    );
    expect(getFontManifestEntry("does-not-exist")).toBeUndefined();
    expect(getFontManifestEntry("../../../etc/passwd")).toBeUndefined();
  });
});
