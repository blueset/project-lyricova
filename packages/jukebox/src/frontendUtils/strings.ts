export function padLeft(number: number, places: number): string {
  return String(number).padStart(places, "0");
}

export function formatTime(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${padLeft(minutes, 2)}:${padLeft(seconds, 2)}`;
}