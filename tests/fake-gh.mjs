#!/usr/bin/env node
// Stands in for `gh` in tests. FAKE_GH_SCENARIO names a JSON file with `steps`; every
// `gh pr view` call advances one step, the other calls answer from the current step.
import fs from "node:fs";

const scenarioFile = process.env.FAKE_GH_SCENARIO;
const scenario = JSON.parse(fs.readFileSync(scenarioFile, "utf8"));
const counterFile = `${scenarioFile}.count`;
const args = process.argv.slice(2);

let count = fs.existsSync(counterFile)
  ? Number(fs.readFileSync(counterFile, "utf8"))
  : 0;
if (args[0] === "pr" && args[1] === "view") {
  count += 1;
  fs.writeFileSync(counterFile, String(count));
}
const step =
  scenario.steps[Math.min(Math.max(count - 1, 0), scenario.steps.length - 1)];

function reply(value, code = 0) {
  if (value !== undefined) process.stdout.write(JSON.stringify(value));
  process.exit(code);
}

if (step.hang) setInterval(() => {}, 1000);
else if (step.error) {
  process.stderr.write(`${step.error}\n`);
  process.exit(1);
} else if (args[0] === "pr" && args[1] === "view") {
  reply({
    number: 7,
    url: "https://github.com/acme/app/pull/7",
    state: "OPEN",
    reviewRequests: [],
    ...step.pr,
  });
} else if (args[0] === "pr" && args[1] === "checks") {
  if (!step.checks || step.checks.length === 0) {
    process.stderr.write("no checks reported on the 'feat/x' branch\n");
    process.exit(1);
  }
  const buckets = step.checks.map((c) => c.bucket);
  reply(
    step.checks,
    buckets.includes("pending") ? 8 : buckets.includes("fail") ? 1 : 0,
  );
} else if (args[0] === "api") {
  const endpoint = args.find((a) => a.startsWith("repos/"));
  if (endpoint.includes("/commits/"))
    reply({
      commit: { committer: { date: step.headDate ?? "2026-01-01T00:00:00Z" } },
    });
  else if (endpoint.endsWith("/comments")) reply([step.comments ?? []]);
  else if (endpoint.endsWith("/reviews")) reply([step.reviews ?? []]);
  else reply(undefined, 1);
} else {
  process.stderr.write(`fake gh: unsupported ${args.join(" ")}\n`);
  process.exit(1);
}
