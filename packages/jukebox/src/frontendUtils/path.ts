/**
 * Replace extension of a path.
 * @param filePath Path to operate on
 * @param ext new extension
 * @returns Path with new extension
 */
export function swapExt(filePath: string, ext: string): string {
  const lastDotIndex = filePath.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return filePath + ext;
  }
  return filePath.slice(0, lastDotIndex) + ext;
}
