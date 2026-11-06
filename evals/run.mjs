#!/usr/bin/env node
// Runs the evaluation scenarios for one skill through `opencode run` and reports which skills loaded.
// Usage: node evals/run.mjs <skill> [index ...] [--model provider/model#variant] [--dry-run] [--timeout <minutes>]
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EVALS_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(EVALS_DIR, "fixtures");
// Greenfield scenarios build a whole API test-first; observed runs take 10-20 minutes,
// so 30 leaves headroom without letting a stuck session run forever.
const DEFAULT_TIMEOUT_MINUTES = 30;
// Enough to read the final report without flooding the terminal.
const MAX_TEXT_CHARS = 1500;

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { indexes: [], dryRun: false, timeout: DEFAULT_TIMEOUT_MINUTES };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--model")
      args.model = argv[++i] ?? fail("--model needs a value");
    else if (arg === "--timeout") {
      args.timeout = Number(argv[++i]);
      if (!(args.timeout > 0))
        fail("--timeout needs a positive number of minutes");
    } else if (arg.startsWith("--")) fail(`unknown option ${arg}`);
    else if (!args.skill) args.skill = arg;
    else if (/^\d+$/.test(arg)) args.indexes.push(Number(arg));
    else fail(`invalid index ${arg}`);
  }
  return args;
}

function availableSkills() {
  return fs
    .readdirSync(EVALS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length));
}

function loadScenarios(skill) {
  const file = path.join(EVALS_DIR, `${skill}.json`);
  if (!fs.existsSync(file))
    fail(`no evals for "${skill}". Available: ${availableSkills().join(", ")}`);
  const scenarios = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(scenarios) || scenarios.length === 0)
    fail(`${file} must be a non-empty array`);
  scenarios.forEach((s, i) => {
    const where = `${skill}.json[${i}]`;
    const isStrings = (v) =>
      Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string");
    if (!isStrings(s.skills))
      fail(`${where}.skills must be a non-empty string array`);
    if (typeof s.query !== "string" || !s.query)
      fail(`${where}.query must be a non-empty string`);
    if (!isStrings(s.expected_behavior))
      fail(`${where}.expected_behavior must be a non-empty string array`);
    if (s.setup !== undefined && !isStrings(s.setup))
      fail(`${where}.setup must be a string array`);
    if (
      s.fixture !== undefined &&
      !fs.existsSync(path.join(FIXTURES_DIR, s.fixture))
    ) {
      fail(`${where}.fixture "${s.fixture}" not found in ${FIXTURES_DIR}`);
    }
  });
  return scenarios;
}

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}

// Returns the work dir, or throws with the failing setup command.
function prepare(skill, index, scenario) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), `skill-eval-${skill}-${index}-`),
  );
  if (scenario.fixture)
    fs.cpSync(path.join(FIXTURES_DIR, scenario.fixture), dir, {
      recursive: true,
    });
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.name", "Skill Eval");
  git(dir, "config", "user.email", "eval@example.invalid");
  if (fs.readdirSync(dir).some((f) => f !== ".git")) {
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "✨ feat: add todo REST API");
  }
  for (const command of scenario.setup ?? []) {
    const result = spawnSync("/bin/sh", ["-c", command], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, EVALS_DIR },
    });
    if (result.status !== 0) {
      throw new Error(
        `setup failed in ${dir}\n  command: ${command}\n  ${result.stderr || result.stdout}`,
      );
    }
  }
  return dir;
}

function runOpencode(dir, title, query, { model, timeout }) {
  const args = ["run", "--auto", "--format", "json", "--title", title];
  if (model) args.push("--model", model);
  args.push(query);
  return new Promise((resolve) => {
    const child = spawn("opencode", args, {
      cwd: dir,
      stdio: ["ignore", "pipe", "inherit"],
    });
    let stdout = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeout * 60_000);
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ stdout, error: error.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, code, timedOut });
    });
  });
}

function parseEvents(stdout) {
  const result = { sessionID: undefined, skills: [], lastText: "" };
  for (const line of stdout.split("\n")) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    result.sessionID ??= event.sessionID;
    const part = event.part ?? {};
    if (
      event.type === "tool_use" &&
      part.tool === "skill" &&
      part.state?.status === "completed"
    ) {
      const id = part.state.input?.id ?? part.state.input?.name;
      if (id) result.skills.push(id);
    }
    if (event.type === "text" && part.text) result.lastText = part.text;
  }
  return result;
}

function truncate(text, max) {
  return text.length > max
    ? `${text.slice(0, max)}\n… (${text.length - max} more chars)`
    : text;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.skill)
    fail(
      `usage: node evals/run.mjs <skill> [index ...] [--model m] [--dry-run] [--timeout min]\nSkills: ${availableSkills().join(", ")}`,
    );
  const scenarios = loadScenarios(args.skill);
  const indexes = args.indexes.length
    ? args.indexes
    : scenarios.map((_, i) => i);
  for (const i of indexes) {
    if (i >= scenarios.length)
      fail(`${args.skill} has scenarios 0-${scenarios.length - 1}, got ${i}`);
  }

  let failed = false;
  for (const i of indexes) {
    const scenario = scenarios[i];
    console.log(`\n=== ${args.skill} #${i} ===\nQuery: ${scenario.query}`);
    let dir;
    try {
      dir = prepare(args.skill, i, scenario);
    } catch (error) {
      console.log(`SETUP FAILED: ${error.message}`);
      failed = true;
      continue;
    }
    console.log(`Work dir: ${dir}`);

    if (args.dryRun) {
      console.log(
        `git log:\n${git(dir, "log", "--oneline", "--all")}git status:\n${git(dir, "status", "--short") || "(clean)\n"}`,
      );
      continue;
    }

    const run = await runOpencode(
      dir,
      `skill-eval ${args.skill} #${i}`,
      scenario.query,
      args,
    );
    const { sessionID, skills, lastText } = parseEvents(run.stdout);
    if (run.error) console.log(`OpenCode failed to start: ${run.error}`);
    if (run.timedOut) console.log(`TIMED OUT after ${args.timeout} minutes`);
    console.log(`Session: ${sessionID ?? "(none)"}`);
    console.log(`Skills loaded: ${skills.join(" → ") || "(none)"}`);
    for (const expected of scenario.skills) {
      const loaded = skills.includes(expected);
      if (!loaded) failed = true;
      console.log(`${loaded ? "PASS" : "FAIL"} ${expected}`);
    }
    console.log("Expected behavior (grade manually):");
    for (const item of scenario.expected_behavior) console.log(`- [ ] ${item}`);
    console.log(
      `Last assistant text:\n${truncate(lastText, MAX_TEXT_CHARS) || "(none)"}`,
    );
  }
  process.exit(failed ? 1 : 0);
}

main();
