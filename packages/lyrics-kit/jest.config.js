module.exports = {
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Source is authored with explicit ESM `.js` specifiers; map them back to
    // the on-disk `.ts`/`.tsx` sources for Jest resolution.
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
};
