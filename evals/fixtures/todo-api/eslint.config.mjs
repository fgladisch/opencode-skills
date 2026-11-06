import { defineConfig, globalIgnores } from "eslint/config";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

const EARLY_EXIT =
  ":matches(ThrowStatement, BreakStatement, ContinueStatement)";
const IF_WITH_ELSE =
  "IfStatement[alternate]:not([alternate.type='IfStatement']):not(IfStatement > .alternate)";

// Early exits: complements no-else-return for throw/break/continue (ESLint's esquery has no `:has(> …)`)
const NO_ELSE_AFTER_EARLY_EXIT = {
  selector: [
    `${IF_WITH_ELSE} > BlockStatement.consequent > ${EARLY_EXIT}`,
    `${IF_WITH_ELSE} > ${EARLY_EXIT}.consequent`,
  ].join(", "),
  message:
    "Unnecessary `else`: the `if` block exits early (throw/break/continue), so move the `else` body after the `if`.",
};

export default defineConfig([
  globalIgnores(["dist/**", "scripts/**"]),
  {
    files: ["**/*.ts"],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      eslintPluginPrettierRecommended,
    ],
    plugins: { sonarjs, unicorn },
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Complexity: cyclomatic ceiling; ESLint 9+ also counts `?.`, default values and `||=`/`&&=`
      complexity: ["error", 18],

      // Complexity: keep functions readable (counts breaks in linear flow, weighted by nesting)
      "sonarjs/cognitive-complexity": ["error", 20],

      // Readability: disallow ternaries nested inside ternaries
      "no-nested-ternary": "error",

      // Parameters: assign to a local variable instead of reassigning a parameter
      "no-param-reassign": ["error", { props: false }],

      // Switch: require a case for every union/enum member, even when a default clause exists
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        {
          considerDefaultExhaustiveForUnions: false,
        },
      ],

      // Logging: warn on console usage, use logger instead
      "no-console": "warn",

      // Formatting: delegate to Prettier (warn to not block commits)
      "prettier/prettier": "warn",

      // Return types: allow TypeScript to infer return types
      "@typescript-eslint/explicit-function-return-type": "off",

      // Boundary types: allow inferred types on exported functions
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // Unsafe rules: disabled because NestJS DI and decorators produce many false positives
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",

      // Unused vars: error, but allow _-prefixed vars for intentionally unused params
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // Async safety: catch unhandled promises and misused async functions
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/require-await": "error",

      // Types: prefer type over interface
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],

      // Types: avoid any outside tests
      "@typescript-eslint/no-explicit-any": "error",

      // Type assertions: keep only necessary assertions
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "as",
          objectLiteralTypeAssertions: "never",
        },
      ],

      // Prefer typed bindings over local `as` assertions
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "VariableDeclarator[init.type='TSAsExpression']:not([init.typeAnnotation.typeName.name='const'])",
          message:
            "Prefer typed bindings over `as` assertions on local assignments (e.g. `const value: MyType = expr`).",
        },
        NO_ELSE_AFTER_EARLY_EXIT,
      ],

      // Object destructuring: prefer destructuring over property reassignment
      "prefer-destructuring": [
        "error",
        {
          object: true,
          array: false,
        },
        {
          enforceForRenamedProperties: false,
        },
      ],

      // Object spreading: use spread instead of Object.assign
      "prefer-object-spread": "error",

      // Nullish coalescing: prefer ?? over ||
      "@typescript-eslint/prefer-nullish-coalescing": "error",

      // Array access: use .at() instead of bracket notation
      "unicorn/prefer-at": "error",

      // Early returns: disallow else after return in if block
      "no-else-return": "error",

      // Error handling: enforce unknown type in .catch() callbacks
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",

      // Readonly: flag class properties that are never reassigned
      "@typescript-eslint/prefer-readonly": "error",

      // Template literals: prefer `${}` over string concatenation
      "prefer-template": "error",

      // Optional chaining: prefer ?. over manual null checks
      "@typescript-eslint/prefer-optional-chain": "error",
    },
  },
  {
    // Relaxed rules for test files and test utilities/fixtures
    files: ["**/*.spec.ts", "**/*.test.ts", "tests/**/*.ts"],
    rules: {
      // Allow any in tests for mocking and test data
      "@typescript-eslint/no-explicit-any": "off",
      // Allow assertion-heavy fixture typing and mock setup in tests
      "@typescript-eslint/consistent-type-assertions": "off",
      // Allow local `as` assertions in tests for concise fixture typing
      "no-restricted-syntax": ["error", NO_ELSE_AFTER_EARLY_EXIT],
      // Prefer-destructuring in tests creates noisy fixture churn
      "prefer-destructuring": "off",
      // Allow fire-and-forget promises in test setup
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      // Allow untyped assignments in mocks and fixtures
      "@typescript-eslint/no-unsafe-assignment": "off",
      // Allow magic numbers in test assertions and fixtures
      "@typescript-eslint/no-magic-numbers": "off",
      // Allow unbound method references in expect() assertions
      "@typescript-eslint/unbound-method": "off",
    },
  },
]);
