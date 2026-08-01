// Real-Android acceptance runner for the Glyph Canvas PoC.
//
// Drives Chrome on the first `adb`-connected Android device via Playwright's
// experimental Android transport, loads the isolated glyph fixture, and runs
// the same shaping / render / karaoke / benchmark assertions as the automated
// `@smoke` case — but on real hardware. See tests/browser/DEVICE-TESTING.md.
//
// Usage (host with `adb` + a connected device, and the fixture server running):
//   FIXTURE_URL="http://<LAN_IP>:4173/glyph.html" \
//     node packages/jukebox/tests/browser/scripts/android-acceptance.mjs
//
// This script is NOT run in CI (no device/adb available there). It exists so
// real-device acceptance is a single documented command, not claimed coverage.

import { _android as android } from "playwright";

const FIXTURE_URL =
  process.env.FIXTURE_URL ?? "http://127.0.0.1:4173/glyph.html";

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
  console.log(`  \u2713 ${message}`);
}

const devices = await android.devices();
if (devices.length === 0) {
  console.error(
    "No adb devices found. Enable USB debugging and run `adb devices`.",
  );
  process.exit(2);
}

const device = devices[0];
console.log(`Device: ${device.model()} (${device.serial()})`);

let context;
try {
  await device.shell("am force-stop com.android.chrome");
  context = await device.launchBrowser();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(FIXTURE_URL);
  await page.waitForFunction(() => Boolean(window.__glyph), null, {
    timeout: 60_000,
  });
  await page.evaluate(() => window.__glyph.ready());
  console.log("Runtime ready on device.");

  const lig = await page.evaluate(() =>
    window.__glyph.layout("ff", { fontChain: ["mona-sans-latin-otf"] }),
  );
  assert(lig.clusters.length === 1, "Latin ligature -> one cluster");
  assert(
    lig.clusters[0].u16Start === 0 && lig.clusters[0].u16End === 2,
    "ligature cluster spans UTF-16 [0,2]",
  );

  const fb = await page.evaluate(() =>
    window.__glyph.layout("A\u3042B", {
      fontChain: ["mona-sans-latin-otf", "tsimsans-j-palt-otf"],
    }),
  );
  assert(
    fb.clusters[1].fontId !== fb.clusters[0].fontId,
    "kana cluster falls back to a different font",
  );

  const fills = {};
  for (const fraction of [0, 0.5, 1]) {
    fills[fraction] = await page.evaluate(async (f) => {
      await window.__glyph.render({
        text: "A",
        fontChain: ["mona-sans-latin-otf"],
        fontSize: 72,
        fillFraction: f,
        activeColor: "#ff2000",
        inactiveColor: "#0040ff",
      });
      return window.__glyph.analyze({
        activeColor: "#ff2000",
        inactiveColor: "#0040ff",
      });
    }, fraction);
  }
  assert(fills[0].active < fills[0].ink * 0.05, "fraction 0 -> ~no active ink");
  assert(fills[1].inactive < fills[1].ink * 0.05, "fraction 1 -> ~all active");
  assert(
    fills[0.5].halves.leftActive > fills[0.5].halves.rightActive,
    "fraction 0.5 -> active concentrated on the leading side",
  );

  const bench = await page.evaluate(() =>
    window.__glyph.benchmark({
      text: "hello glyph world",
      fontChain: ["mona-sans-latin-otf"],
      fontSize: 44,
      frames: 150,
    }),
  );
  assert(bench.shapeCalls === 1, "shaping runs once for 150 frames");
  assert(
    bench.missesFinal === bench.missesAfterFirst,
    "no outline-cache misses after the first frame",
  );
  assert(bench.hitsFinal > bench.hitsAfterFirst, "outline cache hits grow");
  console.log(
    `Device frame time: avg ${bench.avgMs.toFixed(3)}ms, max ${bench.maxFrameMs}ms`,
  );

  const payloads = await page.evaluate(() => window.__glyph.payloads());
  console.log(
    `Payloads: wasm ${payloads.wasmBytes} bytes; loaded fonts ${JSON.stringify(
      payloads.loadedFonts,
    )}`,
  );

  assert(errors.length === 0, `no page errors (${errors.join("; ")})`);
  console.log("\nReal-device acceptance PASSED.");
} finally {
  await context?.close();
  await device.close();
}
