export function virtualRowIndexToTrackIndex(
  virtualRowIndex: number,
): number | null {
  return virtualRowIndex === 0 ? null : virtualRowIndex - 1;
}
