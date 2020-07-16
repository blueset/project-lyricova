import path from "path";


/**
 * Replace extension of a path.
 * @param filePath Path to operate on
 * @param ext new extend
 */
export function swapExt(filePath: string, ext: string): string {
  return path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)) + "." + ext);

}