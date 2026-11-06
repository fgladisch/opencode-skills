module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testRegex: ".*\\.(spec|test)\\.ts$",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.ts"],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "@/(.*)$": "<rootDir>/src/$1",
  },
};
