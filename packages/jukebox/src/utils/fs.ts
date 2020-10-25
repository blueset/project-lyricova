import { readdirSync, statSync } from "fs";
import path from "path";

/**
 * Find files under the directory modified after the specific date.
 */
export function findFilesModifiedAfter(date: Date, directory: string): string[] {
  const files = readdirSync(directory);
  return files.map((v) => {
    try {
      const stats = statSync(path.join(directory, v));
      return { path: v, include: stats.mtime >= date };
    } catch (e) {
      return { path: v, include: false };
    }
  })
    .filter(v => v.include)
    .map(v => v.path);
}