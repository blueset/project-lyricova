export default function* chunkArray<T>(arr: T[], chunk: number = 100) {
  if (chunk <= 0) throw Error(`chunk size ${chunk} must be positive.`);
  let iterationCount = 0;
  for (let i = 0; i < arr.length; i += chunk) {
    yield arr.slice(i, i + chunk);
    iterationCount++;
  }
  return iterationCount;
}