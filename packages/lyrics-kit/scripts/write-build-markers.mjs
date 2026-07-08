// Writes nested package.json "type" markers so Node interprets each dual build
// with the correct module system regardless of the root package.json "type":
//   build/main   -> CommonJS (require condition)
//   build/module -> ESM      (import condition)
import { writeFileSync, mkdirSync } from "node:fs";

for (const [dir, type] of [
  ["build/main", "commonjs"],
  ["build/module", "module"],
]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/package.json`, JSON.stringify({ type }) + "\n");
}
