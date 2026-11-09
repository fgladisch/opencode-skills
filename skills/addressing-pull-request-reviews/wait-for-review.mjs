#!/usr/bin/env node
// Waits, with a hard deadline, until every check on a pull request head has finished and
// the named reviewers have posted on that head. Prints one JSON report on stdout.
// Usage: node wait-for-review.mjs [<pr>] [--repo owner/repo] [--head <sha>]
//          [--reviewer <login>]... [--since <iso>] [--timeout <minutes>]
//          [--interval <seconds>] [--quiet <seconds>] [--no-checks-grace <seconds>]
//          [--call-timeout <seconds>] [--max-errors <n>]
// Exit codes: 0 passed or no checks, 1 a check failed or was cancelled, 2 usage or
// repeated gh errors, 3 pull request closed or merged, 8 deadline reached.
import { execFile } from "node:child_process";

const EXIT = {
  passed: 0,
  "no-checks": 0,
  failed: 1,
  error: 2,
  closed: 3,
  timeout: 8,
};

function usage(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(EXIT.error);
}

function parseArgs(argv) {
  const opts = {
    reviewers: [],
    // Long enough for CI plus an automated review; a longer wait usually means a stuck check.
    timeout: 45,
    // Matches `gh pr checks --watch -i 20`, about 9 API calls a minute.
    interval: 20,
    // Checks triggered by other checks register shortly after those finish.
    quiet: 60,
    // GitHub usually registers checks 30 to 90 seconds after a push.
    noChecksGrace: 180,
    // A healthy `gh` call returns within seconds; this only catches a hung one.
    callTimeout: 60,
    // Rides out a transient API error without hiding a persistent one.
    maxErrors: 3,
  };
  const numeric = {
    "--timeout": "timeout",
    "--interval": "interval",
    "--quiet": "quiet",
    "--no-checks-grace": "noChecksGrace",
    "--call-timeout": "callTimeout",
    "--max-errors": "maxErrors",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => argv[++i] ?? usage(`${arg} needs a value`);
    if (numeric[arg]) {
      const n = Number(value());
      if (!(n >= 0)) usage(`${arg} needs a non-negative number`);
      opts[numeric[arg]] = n;
    } else if (arg === "--repo" || arg === "-R") opts.repo = value();
    else if (arg === "--head") opts.head = value();
    else if (arg === "--reviewer") opts.reviewers.push(value());
    else if (arg === "--since") opts.since = value();
    else if (arg.startsWith("-")) usage(`unknown option ${arg}`);
    else if (!opts.pr) opts.pr = arg;
    else usage(`unexpected argument ${arg}`);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const started = Date.now();
const deadline = started + opts.timeout * 60_000;
const repoArgs = opts.repo ? ["-R", opts.repo] : [];
const prArgs = opts.pr ? [opts.pr] : [];

// Resolves with stdout; `ok` lists exit codes whose stdout is still a valid answer.
function gh(args, ok = [0]) {
  return new Promise((resolve, reject) => {
    execFile(
      "gh",
      args,
      { timeout: opts.callTimeout * 1000, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const code = error ? error.code : 0;
        if (error?.killed || error?.signal)
          reject(
            new Error(
              `gh ${args.slice(0, 2).join(" ")} timed out after ${opts.callTimeout}s`,
            ),
          );
        else if (typeof code === "number" && ok.includes(code))
          resolve({ stdout, stderr, code });
        else
          reject(
            new Error(
              `gh ${args.slice(0, 2).join(" ")} failed: ${(stderr || error?.message || "").trim()}`,
            ),
          );
      },
    );
  });
}

const normalize = (login) =>
  String(login ?? "")
    .toLowerCase()
    .replace(/\[bot\]$/, "");

async function readPr() {
  const { stdout } = await gh([
    "pr",
    "view",
    ...prArgs,
    ...repoArgs,
    "--json",
    "number,url,state,headRefOid,reviewRequests",
  ]);
  return JSON.parse(stdout);
}

async function readChecks() {
  const { stdout, stderr, code } = await gh(
    [
      "pr",
      "checks",
      ...prArgs,
      ...repoArgs,
      "--json",
      "name,bucket,workflow,link",
    ],
    [0, 1, 8],
  );
  if (code === 1 && !stdout.trim()) {
    if (/no checks reported/i.test(stderr)) return [];
    throw new Error(`gh pr checks failed: ${stderr.trim()}`);
  }
  return JSON.parse(stdout);
}

async function api(endpoint, paginate) {
  const args = [
    "api",
    endpoint,
    ...(paginate ? ["--paginate", "--slurp"] : []),
  ];
  const { stdout } = await gh(args);
  const data = JSON.parse(stdout);
  return paginate ? data.flat() : data;
}

const headDates = new Map();
async function reviewerStates(pr) {
  if (opts.reviewers.length === 0) return {};
  const [, owner, repo] = new URL(pr.url).pathname.split("/");
  const base = `repos/${owner}/${repo}`;
  let since = opts.since;
  if (!since) {
    if (!headDates.has(pr.headRefOid)) {
      const commit = await api(`${base}/commits/${pr.headRefOid}`);
      headDates.set(pr.headRefOid, commit.commit.committer.date);
    }
    since = headDates.get(pr.headRefOid);
  }
  const [issueComments, reviewComments, reviews] = await Promise.all([
    api(`${base}/issues/${pr.number}/comments`, true),
    api(`${base}/pulls/${pr.number}/comments`, true),
    api(`${base}/pulls/${pr.number}/reviews`, true),
  ]);
  const activity = [
    ...issueComments.map((c) => [c.user?.login, c.updated_at]),
    ...reviewComments.map((c) => [c.user?.login, c.updated_at]),
    ...reviews.map((r) => [r.user?.login, r.submitted_at]),
  ];
  const requested = new Set(
    (pr.reviewRequests ?? []).map((r) => normalize(r.login)),
  );
  const sinceTime = Date.parse(since);
  const states = {};
  for (const reviewer of opts.reviewers) {
    const login = normalize(reviewer);
    if (requested.has(login)) states[reviewer] = "requested";
    else if (
      activity.some(
        ([who, at]) => normalize(who) === login && Date.parse(at) >= sinceTime,
      )
    )
      states[reviewer] = "posted";
    else states[reviewer] = "waiting";
  }
  return states;
}

function groupChecks(checks) {
  const groups = {
    passed: [],
    failed: [],
    cancelled: [],
    pending: [],
    skipped: [],
  };
  const key = {
    pass: "passed",
    fail: "failed",
    cancel: "cancelled",
    pending: "pending",
    skipping: "skipped",
  };
  for (const check of checks)
    groups[key[check.bucket] ?? "pending"].push(check.name);
  return groups;
}

function finish(result, state, error) {
  const report = {
    result,
    pr: state.pr?.number ?? opts.pr ?? null,
    url: state.pr?.url ?? null,
    head: state.pr?.headRefOid ?? null,
    checks: groupChecks(state.checks ?? []),
    reviewers: state.reviewers ?? {},
    elapsedSeconds: Math.round((Date.now() - started) / 1000),
    ...(error && { error }),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(EXIT[result]);
}

const sleep = (seconds) =>
  new Promise((resolve) =>
    setTimeout(
      resolve,
      Math.max(0, Math.min(seconds * 1000, deadline - Date.now())),
    ),
  );

function describe(state, waitingFor) {
  const groups = groupChecks(state.checks);
  const counts = Object.entries(groups)
    .filter(([, names]) => names.length)
    .map(([group, names]) => `${names.length} ${group}`)
    .join(", ");
  const reviewers = Object.entries(state.reviewers)
    .map(([who, s]) => `${who}=${s}`)
    .join(" ");
  return `head ${state.pr.headRefOid.slice(0, 7)}: ${counts || "no checks"}${reviewers ? `; reviewers ${reviewers}` : ""}${waitingFor ? `; waiting for ${waitingFor}` : ""}`;
}

async function main() {
  let state = {};
  let errors = 0;
  let lastSignature;
  let stableSince;
  let lastLine;
  while (Date.now() < deadline) {
    try {
      const pr = await readPr();
      state = { pr, checks: [], reviewers: {} };
      if (pr.state !== "OPEN") finish("closed", state);
      if (opts.head && !pr.headRefOid.startsWith(opts.head)) {
        state.waitingFor = `head ${opts.head}`;
      } else {
        state.checks = await readChecks();
        state.reviewers = await reviewerStates(pr);
        const groups = groupChecks(state.checks);
        const reviewersPending = Object.entries(state.reviewers)
          .filter(([, s]) => s !== "posted")
          .map(([who]) => who);
        const noChecks = state.checks.length === 0;
        if (groups.pending.length) state.waitingFor = groups.pending.join(", ");
        else if (noChecks && (Date.now() - started) / 1000 < opts.noChecksGrace)
          state.waitingFor = "checks to register";
        else if (reviewersPending.length)
          state.waitingFor = reviewersPending.join(", ");
        else state.waitingFor = undefined;
      }
      errors = 0;

      const signature = JSON.stringify([
        state.pr.headRefOid,
        state.checks.map((c) => [c.name, c.bucket]).sort(),
        state.reviewers,
        state.waitingFor,
      ]);
      if (signature !== lastSignature) {
        lastSignature = signature;
        stableSince = Date.now();
      }
      const line = describe(state, state.waitingFor);
      if (line !== lastLine) {
        process.stderr.write(`${new Date().toISOString()} ${line}\n`);
        lastLine = line;
      }
      if (
        !state.waitingFor &&
        (Date.now() - stableSince) / 1000 >= opts.quiet
      ) {
        const groups = groupChecks(state.checks);
        if (state.checks.length === 0) finish("no-checks", state);
        finish(
          groups.failed.length || groups.cancelled.length ? "failed" : "passed",
          state,
        );
      }
    } catch (error) {
      errors += 1;
      process.stderr.write(
        `${new Date().toISOString()} ${error.message} (${errors}/${opts.maxErrors})\n`,
      );
      if (errors >= opts.maxErrors) finish("error", state, error.message);
    }
    await sleep(opts.interval);
  }
  finish("timeout", state);
}

main();
