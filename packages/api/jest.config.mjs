/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  // Source is authored as ESM with explicit `.js` specifiers (NodeNext);
  // map them back to the on-disk `.ts`/`.tsx` sources for Jest resolution.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testRegex: "(\\.|/)(test|spec)\\.tsx?$",
};
