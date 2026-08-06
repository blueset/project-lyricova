import type { Request, Response } from "express";
import { Router } from "express";

import { FONT_MANIFEST } from "../fonts/manifest.js";
import {
  loadFontById,
  matchesIfNoneMatch,
  statFontById,
} from "../fonts/server.js";
import { getFontCoverage } from "../fonts/coverage.js";

/**
 * Serves the whitelisted raw-OTF glyph font chain that this API package
 * owns (see `src/fonts/manifest.ts`) at `/api/fonts`. This lets
 * browser-side glyph shaping consumers (the WASM glyph renderer in
 * `packages/glyph-renderer`) discover font IDs and metadata without
 * hardcoding file names or duplicating font binaries, and fetch their
 * bytes on demand.
 *
 * Jukebox's `/api` proxy forwards these requests here. This controller never
 * reads Jukebox's private `next/font` directory and never serves anything
 * outside `FONT_MANIFEST`.
 */

/**
 * Font byte and coverage URLs carry only a stable manifest id (no content
 * hash), and the fonts are script-regenerated, so a cached copy could
 * otherwise pair stale bytes with fresh coverage (or vice versa) for up to
 * a year. Instead of `immutable`, always revalidate against the strong,
 * content-derived ETag: the conditional 304 path keeps this cheap even for
 * the ~30 MB variable font. Mirrors the WASM route in
 * `packages/jukebox/src/app/api/glyph-renderer/wasm/route.ts`.
 */
const REVALIDATE_CACHE_CONTROL = "public, no-cache, must-revalidate";

export class FontsController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.get("/", this.listFonts);
    // Must be registered before "/:fontId" so it isn't captured as a font id.
    this.router.get("/coverage", this.getCoverage);
    this.router.get("/:fontId", this.getFont);
  }

  /**
   * @openapi
   * /fonts:
   *   get:
   *     summary: List whitelisted glyph fonts available for delivery
   *     description: >
   *       Lists every font in the whitelist with its metadata and byte
   *       size. Sizes are resolved with `fs.stat` only (no byte reads), so
   *       listing never populates the on-demand byte cache.
   *     tags:
   *       - Fonts
   *     responses:
   *       200:
   *         description: Whitelisted font manifest, with resolved sizes
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 fonts:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         example: mona-sans-latin-otf
   *                       url:
   *                         type: string
   *                         example: /api/fonts/mona-sans-latin-otf
   *                       contentType:
   *                         type: string
   *                         example: font/otf
   *                       family:
   *                         type: string
   *                         example: Mona Sans
   *                       script:
   *                         type: string
   *                         enum: [latin, japanese, han-latin, thai, simplified-chinese, traditional-chinese]
   *                       rawSfnt:
   *                         type: boolean
   *                       eagerFetch:
   *                         type: boolean
   *                       sizeBytes:
   *                         type: integer
   *                         nullable: true
   */
  private listFonts = async (req: Request, res: Response) => {
    const entries = await Promise.all(
      FONT_MANIFEST.map(async (entry) => {
        const stat = await statFontById(entry.id);
        return {
          id: entry.id,
          url: `/api/fonts/${entry.id}`,
          contentType: entry.contentType,
          family: entry.family,
          script: entry.script,
          rawSfnt: entry.rawSfnt,
          eagerFetch: entry.eagerFetch,
          sizeBytes: stat?.sizeBytes ?? null,
        };
      }),
    );

    res.set("Cache-Control", "public, max-age=300");
    res.json({ fonts: entries });
  };

  /**
   * @openapi
   * /fonts/coverage:
   *   get:
   *     summary: Compact code-point coverage index for every whitelisted font
   *     description: >
   *       Returns, for each whitelisted font, the inclusive UTF-32 code
   *       point ranges its real `cmap` covers (ascending and
   *       non-overlapping). This lets a browser client decide which
   *       font(s) to lazily fetch for a given piece of text without
   *       downloading any font binary first. The payload is derived from
   *       the actual shipped bytes, memoized in memory, and served with a
   *       strong ETag so conditional requests (`If-None-Match`) get a
   *       `304`.
   *     tags:
   *       - Fonts
   *     parameters:
   *       - in: header
   *         name: If-None-Match
   *         schema:
   *           type: string
   *         required: false
   *         description: Strong/weak/comma-separated ETag(s) for conditional GET
   *     responses:
   *       200:
   *         description: Per-font code point coverage ranges
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 fonts:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         example: source-han-sans-jp-vf
   *                       ranges:
   *                         type: array
   *                         description: >
   *                           Inclusive `[startCodepoint, endCodepoint]`
   *                           UTF-32 ranges, ascending and non-overlapping.
   *                         items:
   *                           type: array
   *                           items:
   *                             type: integer
   *                           minItems: 2
   *                           maxItems: 2
   *       304:
   *         description: Client's cached copy is still fresh
   */
  private getCoverage = async (req: Request, res: Response) => {
    const coverage = await getFontCoverage();

    const ifNoneMatchHeader = req.headers["if-none-match"];
    const ifNoneMatch = Array.isArray(ifNoneMatchHeader)
      ? ifNoneMatchHeader.join(", ")
      : ifNoneMatchHeader;
    if (matchesIfNoneMatch(ifNoneMatch, coverage.etag)) {
      res.set({
        ETag: coverage.etag,
        "Cache-Control": REVALIDATE_CACHE_CONTROL,
      });
      res.status(304).end();
      return;
    }

    res.set({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": REVALIDATE_CACHE_CONTROL,
      ETag: coverage.etag,
    });
    res.status(200).send(coverage.json);
  };

  /**
   * @openapi
   * /fonts/{fontId}:
   *   get:
   *     summary: Fetch whitelisted glyph font bytes by ID
   *     description: >
   *       `fontId` is only ever used as a lookup key into the whitelist —
   *       it is never concatenated into a filesystem path, so path
   *       traversal payloads (`../..`, absolute paths, encoded slashes,
   *       etc.) simply fail the whitelist lookup and yield a `404`
   *       instead of touching the filesystem. Supports conditional
   *       requests via `If-None-Match`.
   *     tags:
   *       - Fonts
   *     parameters:
   *       - in: path
   *         name: fontId
   *         schema:
   *           type: string
   *         required: true
   *         description: Whitelisted font identifier from `GET /fonts`
   *       - in: header
   *         name: If-None-Match
   *         schema:
   *           type: string
   *         required: false
   *         description: Strong/weak/comma-separated ETag(s) for conditional GET
   *     responses:
   *       200:
   *         description: Raw font bytes
   *         content:
   *           font/otf:
   *             schema:
   *               type: string
   *               format: binary
   *           font/ttf:
   *             schema:
   *               type: string
   *               format: binary
   *       304:
   *         description: Client's cached copy is still fresh
   *       404:
   *         description: Unknown font id
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Unknown font id: does-not-exist"
   */
  private getFont = async (req: Request, res: Response) => {
    const fontId = req.params.fontId as string;
    const loaded = await loadFontById(fontId);
    if (!loaded) {
      res.status(404).json({ error: `Unknown font id: ${fontId}` });
      return;
    }

    const ifNoneMatchHeader = req.headers["if-none-match"];
    const ifNoneMatch = Array.isArray(ifNoneMatchHeader)
      ? ifNoneMatchHeader.join(", ")
      : ifNoneMatchHeader;
    if (matchesIfNoneMatch(ifNoneMatch, loaded.etag)) {
      res.set({
        ETag: loaded.etag,
        "Cache-Control": REVALIDATE_CACHE_CONTROL,
      });
      res.status(304).end();
      return;
    }

    res.set({
      "Content-Type": loaded.entry.contentType,
      "Content-Length": String(loaded.buffer.byteLength),
      "Cache-Control": REVALIDATE_CACHE_CONTROL,
      ETag: loaded.etag,
    });
    res.status(200).send(loaded.buffer);
  };
}
