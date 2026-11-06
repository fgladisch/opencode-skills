// Setup helper: node "$EVALS_DIR/replace.mjs" <file> <search> <replacement> [<search> <replacement> ...]
// Replaces exact text and fails when a search string is missing, so a drifted fixture
// aborts the scenario instead of silently planting nothing. `\n` in arguments means a newline,
// because POSIX sh has no portable escape syntax for it.
import fs from "node:fs";

const [file, ...pairs] = process.argv.slice(2);
if (!file || pairs.length === 0 || pairs.length % 2 !== 0) {
  console.error("usage: replace.mjs <file> <search> <replacement> [...]");
  process.exit(2);
}

let text = fs.readFileSync(file, "utf8");
for (let i = 0; i < pairs.length; i += 2) {
  const [search, replacement] = [pairs[i], pairs[i + 1]].map((s) =>
    s.replaceAll("\\n", "\n"),
  );
  if (!text.includes(search)) {
    console.error(
      `replace.mjs: ${JSON.stringify(search)} not found in ${file}`,
    );
    process.exit(1);
  }
  text = text.replace(search, () => replacement);
}
fs.writeFileSync(file, text);
