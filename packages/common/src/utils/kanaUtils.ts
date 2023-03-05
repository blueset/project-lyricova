/**
 * Convert katakana to hiragana.
 * @param str katakana
 */
export function kanaToHira(str: string): string {
  return (
    str &&
    str.replace(/[\u30a1-\u30f6]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0x60)
    )
  );
}
