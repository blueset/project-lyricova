export default function chunkArray<T>(arr: T[], chunk: number = 100): T[][] {
  if (chunk <= 0) throw Error("chunk = {chunk} must be positive.");
  const result: T[][] = [];
  for (let i = 0; i < arr.length;) {
    result.push(arr.slice(i, i + chunk));
  }
  return result;
}