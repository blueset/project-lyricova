# Glyph Canvas — real Android device acceptance

The automated browser suite (`npm run test:browser -w @lyricova/jukebox`)
includes an **emulated** `mobile-chromium` project (Pixel 5 device descriptor:
393×851 CSS px, `devicePixelRatio` 2.625, touch + mobile UA). It runs the
critical `@smoke` case (`tests/browser/specs/glyph-smoke.spec.ts`) so the glyph
shaper + Canvas2D `Path2D` renderer are exercised under a mobile viewport /
high-DPR / touch configuration on every run.

Emulated viewport coverage is **not** the same as a real Android device: it
uses desktop Chromium's Skia rasteriser and the host's font stack, not Android
Chrome on real GPU/driver/OEM font infrastructure.

## Why real-device coverage is not run automatically

Real Android coverage is intentionally **not** claimed by CI. On the CI runners
and this development container none of the prerequisites exist:

| Prerequisite | Status here | Check |
| --- | --- | --- |
| `adb` (Android Platform Tools) | **missing** | `which adb` → not found |
| Android SDK (`ANDROID_HOME` / `ANDROID_SDK_ROOT`) | **unset** | both env vars empty |
| USB device passthrough | **unavailable** | `/dev/bus/usb` does not exist |
| A physical/emulated Android target | **none attached** | `adb devices` → command not found |

CI runs on headless Linux VMs with no attached hardware and no USB passthrough,
so `adb`/Playwright's Android transport cannot see a device. Adding a real
device to CI needs a self-hosted runner with a connected phone or a device-farm
integration, which is out of scope for this PoC.

## Manual/device acceptance (run on a machine with a real phone)

Prerequisites on the host:

1. Install Android Platform Tools so `adb` is on `PATH`.
2. On the phone: enable **Developer options → USB debugging**, install Chrome,
   connect over USB, and accept the debugging prompt.
3. Confirm the device is visible:

   ```bash
   adb devices          # expect: <serial>	device
   ```

### Option A — Playwright Android transport (recommended)

Playwright can drive Chrome on the connected device directly. Point the fixture
server at your machine's LAN IP so the phone can reach it, then run the
acceptance script below.

```bash
# 1. Build the WASM the fixture serves and start the isolated fixture server.
npm run build -w @lyricova/glyph-renderer
npm --prefix packages/jukebox exec -- \
  vite --config tests/browser/vite.config.ts --host 0.0.0.0 &

# 2. Drive real Android Chrome against it (replace <LAN_IP>).
FIXTURE_URL="http://<LAN_IP>:4173/glyph.html" \
  node packages/jukebox/tests/browser/scripts/android-acceptance.mjs
```

`android-acceptance.mjs` (provided) launches Chrome on the first `adb` device
via `playwright._android`, loads the fixture, and runs the same shaping / render
/ karaoke / benchmark assertions the `@smoke` case runs, then prints the
per-device numbers.

### Option B — `chromium.connectOverCDP` via `adb forward`

If you prefer remote debugging:

```bash
adb forward tcp:9222 localabstract:chrome_devtools_remote
# open Chrome on the phone to http://<LAN_IP>:4173/glyph.html, then:
node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.connectOverCDP('http://localhost:9222');/* inspect window.__glyph */await b.close();})()"
```

## Manual acceptance checklist

Load `http://<LAN_IP>:4173/glyph.html` in **Chrome on the physical device** and
confirm, on real hardware:

- [ ] `window.__glyph.ready()` resolves (WASM instantiates on the device's V8).
- [ ] `window.__glyph.layout("ff", { fontChain: ["mona-sans-latin-otf"] })`
      returns **one** cluster spanning UTF-16 `[0,2]` (ligature clustering).
- [ ] `window.__glyph.layout("A\u3042B", …)` resolves the kana cluster to a
      different font id than the Latin clusters (fallback).
- [ ] `window.__glyph.render({ text: "Ag", fillFraction: 1, … })` followed by
      `window.__glyph.analyze()` reports non-zero ink (glyphs actually paint via
      the device GPU).
- [ ] Karaoke fill at fraction `0` / `0.5` / `1` shows no fill / left-half fill /
      full fill (`analyze().halves`).
- [ ] `window.__glyph.benchmark({ frames: 150, … })` reports `shapeCalls === 1`,
      `missesFinal === missesAfterFirst`, `hitsFinal > hitsAfterFirst`, and an
      `avgMs` that is comfortable on the device (record the actual number — it
      will be higher than desktop).
- [ ] The lifecycle harness (`lc-*` controls) responds to play/pause/seek/rate
      and repaints, with `lc-shapes` staying at `1` across clock activity.
- [ ] No entries in the browser console error log.

Record the device model, Android/Chrome versions, and the measured `benchmark`
numbers in the PR/acceptance notes.
