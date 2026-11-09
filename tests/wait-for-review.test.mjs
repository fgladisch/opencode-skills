import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SCRIPT = path.join(
  ROOT,
  "skills/addressing-pull-request-reviews/wait-for-review.mjs",
);
const FAKE_GH = path.join(ROOT, "tests/fake-gh.mjs");

const HEAD = "a".repeat(40);
const OLD_HEAD = "b".repeat(40);
const pass = (name) => ({ name, bucket: "pass", workflow: "ci", link: "" });
const pending = (name) => ({
  name,
  bucket: "pending",
  workflow: "ci",
  link: "",
});
const fail = (name) => ({ name, bucket: "fail", workflow: "ci", link: "" });

// Fast defaults so every scenario finishes in well under a second per poll.
const FAST = ["--interval", "0.02", "--quiet", "0", "--call-timeout", "2"];

function run(steps, args = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wait-for-review-"));
  fs.writeFileSync(
    path.join(dir, "gh"),
    `#!/bin/sh\nexec node ${JSON.stringify(FAKE_GH)} "$@"\n`,
    { mode: 0o755 },
  );
  const scenario = path.join(dir, "scenario.json");
  fs.writeFileSync(scenario, JSON.stringify({ steps }));
  return new Promise((resolve) => {
    const child = spawn("node", [SCRIPT, "7", ...FAST, ...args], {
      env: {
        ...process.env,
        PATH: `${dir}:${process.env.PATH}`,
        FAKE_GH_SCENARIO: scenario,
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      let report;
      try {
        report = JSON.parse(stdout);
      } catch {
        report = undefined;
      }
      resolve({ code, report, stdout, stderr });
    });
  });
}

test("reports passed once every check on the head has passed", async () => {
  const { code, report } = await run([
    { pr: { headRefOid: HEAD }, checks: [pending("build"), pass("lint")] },
    { pr: { headRefOid: HEAD }, checks: [pass("build"), pass("lint")] },
  ]);
  assert.equal(code, 0);
  assert.equal(report.result, "passed");
  assert.equal(report.head, HEAD);
  assert.deepEqual(report.checks.passed.sort(), ["build", "lint"]);
});

test("waits until the pull request head is the pushed commit", async () => {
  const { code, report } = await run(
    [
      { pr: { headRefOid: OLD_HEAD }, checks: [pass("build")] },
      { pr: { headRefOid: HEAD }, checks: [pending("build")] },
      { pr: { headRefOid: HEAD }, checks: [pass("build")] },
    ],
    ["--head", HEAD.slice(0, 7)],
  );
  assert.equal(code, 0);
  assert.equal(report.head, HEAD);
});

test("reports failed checks by name", async () => {
  const { code, report } = await run([
    { pr: { headRefOid: HEAD }, checks: [fail("e2e"), pass("lint")] },
  ]);
  assert.equal(code, 1);
  assert.equal(report.result, "failed");
  assert.deepEqual(report.checks.failed, ["e2e"]);
});

test("gives up at the deadline and names what is still pending", async () => {
  const started = Date.now();
  const { code, report } = await run(
    [{ pr: { headRefOid: HEAD }, checks: [pending("review"), pass("lint")] }],
    ["--timeout", "0.01"],
  );
  assert.equal(code, 8);
  assert.equal(report.result, "timeout");
  assert.deepEqual(report.checks.pending, ["review"]);
  assert.ok(Date.now() - started < 10_000);
});

test("does not finish before checks are registered", async () => {
  const { code, report } = await run([
    { pr: { headRefOid: HEAD }, checks: [] },
    { pr: { headRefOid: HEAD }, checks: [] },
    { pr: { headRefOid: HEAD }, checks: [pass("build")] },
  ]);
  assert.equal(code, 0);
  assert.deepEqual(report.checks.passed, ["build"]);
});

test("reports no checks when none appear within the grace period", async () => {
  const { code, report } = await run(
    [{ pr: { headRefOid: HEAD }, checks: [] }],
    ["--no-checks-grace", "0.1"],
  );
  assert.equal(code, 0);
  assert.equal(report.result, "no-checks");
});

test("waits for a check that registers after the others completed", async () => {
  const { code, report } = await run(
    [
      { pr: { headRefOid: HEAD }, checks: [pass("build")] },
      { pr: { headRefOid: HEAD }, checks: [pass("build"), pending("review")] },
      { pr: { headRefOid: HEAD }, checks: [pass("build"), pass("review")] },
    ],
    ["--quiet", "0.05", "--interval", "0.03"],
  );
  assert.equal(code, 0);
  assert.deepEqual(report.checks.passed.sort(), ["build", "review"]);
});

test("waits for a reviewer to post after the head commit", async () => {
  const headDate = "2026-11-09T12:00:00Z";
  const before = {
    user: { login: "review-bot[bot]" },
    updated_at: "2026-11-09T11:00:00Z",
  };
  const after = {
    user: { login: "review-bot[bot]" },
    updated_at: "2026-11-09T12:05:00Z",
  };
  const { code, report } = await run(
    [
      {
        pr: { headRefOid: HEAD },
        checks: [pass("build")],
        headDate,
        comments: [before],
      },
      {
        pr: { headRefOid: HEAD, reviewRequests: [{ login: "review-bot" }] },
        checks: [pass("build")],
        headDate,
        comments: [before],
      },
      {
        pr: { headRefOid: HEAD },
        checks: [pass("build")],
        headDate,
        comments: [after],
      },
    ],
    ["--reviewer", "review-bot"],
  );
  assert.equal(code, 0);
  assert.deepEqual(report.reviewers, { "review-bot": "posted" });
});

test("counts a submitted review as reviewer activity", async () => {
  const { code, report } = await run(
    [
      {
        pr: { headRefOid: HEAD },
        checks: [pass("build")],
        headDate: "2026-11-09T12:00:00Z",
        reviews: [
          { user: { login: "alice" }, submitted_at: "2026-11-09T12:30:00Z" },
        ],
      },
    ],
    ["--reviewer", "alice"],
  );
  assert.equal(code, 0);
  assert.deepEqual(report.reviewers, { alice: "posted" });
});

test("kills a hanging gh call and stops after repeated errors", async () => {
  const started = Date.now();
  const { code, report } = await run(
    [{ hang: true }],
    ["--call-timeout", "0.2"],
  );
  assert.equal(code, 2);
  assert.equal(report.result, "error");
  assert.match(report.error, /timed out/);
  assert.ok(Date.now() - started < 10_000);
});

test("retries a transient gh error", async () => {
  const { code, report } = await run([
    { error: "HTTP 502: Bad Gateway" },
    { pr: { headRefOid: HEAD }, checks: [pass("build")] },
  ]);
  assert.equal(code, 0);
  assert.equal(report.result, "passed");
});

test("stops when the pull request is no longer open", async () => {
  const { code, report } = await run([
    { pr: { headRefOid: HEAD, state: "MERGED" }, checks: [pass("build")] },
  ]);
  assert.equal(code, 3);
  assert.equal(report.result, "closed");
});
