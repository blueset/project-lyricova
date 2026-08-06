# Jukebox

The jukebox component as a music player and manager.

## Node dependencies

```bash
npm install
```

## Python 3 dependencies

```bash
pip install yt-dlp
```

## Binary dependencies

- MySQL
  - Setup `ngram` index: add `ngram_token_size=1` under `[mysqld]` section of
    `my.cnf`. See
    [MySQL docs](https://dev.mysql.com/doc/refman/8.0/en/fulltext-search-ngram.html)
    for details.
- [MeCab](https://taku910.github.io/mecab/)
- [MeCab IPADic NeologD](https://github.com/neologd/mecab-ipadic-neologd) @
  `/usr/local/lib/mecab/dic/mecab-ipadic-neologd`

## Config

See `.env.example`.

## Font delivery for browser glyph shaping

`GET /api/fonts` lists whitelisted fonts (id, URL, MIME type, script
coverage), and `GET /api/fonts/:fontId` streams the raw bytes for a
whitelisted `fontId` with correct `Content-Type`/`Cache-Control`/`ETag`
headers (404 for any unknown id, including path-traversal attempts — `fontId`
is only ever used as a lookup key, never concatenated into a filesystem
path). This exists so browser-side glyph shaping (e.g. a WASM glyph
renderer) can fetch the API package's existing raw SFNT bytes without
duplicating multi-megabyte binaries. Jukebox reaches these endpoints through
its normal `/api/:path*` backend proxy. The renderer that consumes this is the
"Glyph Canvas (PoC)" lyrics module — see
[`docs/glyph-canvas-poc.md`](../../docs/glyph-canvas-poc.md) at the repo root
for the platform research, architecture, and known limitations behind it.

- The whitelist and server helpers live in
  `packages/api/src/fonts/{manifest,server}.ts`; the Express controller is
  `packages/api/src/controller/FontsController.ts`.
- Only API-owned raw OTF/TTF fonts used by the glyph renderer are exposed. Jukebox's
  `next/font` WOFF2 assets remain private build inputs and are not API assets.
- The isolated Vite fixture (`tests/browser`) cannot reach a running Next.js
  server, so `tests/browser/vite.config.ts` registers dev-server middleware
  that mirrors the same whitelist at `/test-fonts` and `/test-fonts/:fontId`
  using the API package's manifest/server modules — no font bytes are copied
  into the fixture. Fixture/spec code should resolve font URLs
  through `tests/browser/fixture/src/testFonts.ts#resolveTestFontUrl`, which
  defaults to `/test-fonts/:fontId` but honors a `VITE_FONT_BASE_URL`
  env override (e.g. `VITE_FONT_BASE_URL=http://127.0.0.1:8082/api/fonts`)
  for specs that need to hit a real Jukebox+API deployment instead.
