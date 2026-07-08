export function move<T>(array: T[], from: number, to: number): T[] {
  const result = Array.from(array);
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
}
