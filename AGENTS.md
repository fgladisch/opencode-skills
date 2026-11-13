# AGENTS.md

Project context for agents working in this repository (`opencode-workflow`).

## Golden rule: keep skills, agents, and `README.md` in sync

The `## Skills` table in `README.md` is the human-facing index of every skill in this repo, and the `## Agents` table indexes every file in `agents/`. Both **must** stay in sync with the actual files. Whenever you make any of the following changes, update `README.md` in the same change:

- **Adding a skill** — create `skills/<skill-name>/SKILL.md` _and_ add a row to the `## Skills` table in `README.md`. Insert the row in alphabetical order by skill name.
- **Removing a skill** — delete the directory _and_ remove its row from the table.
- **Renaming a skill** — rename the directory _and_ update the row (name + link target if any).
- **Changing what a skill is for** — if you materially change the `description` in a skill's frontmatter (the "When to use" summary), update the matching row in the table so they tell the same story.
- **Adding, removing, or renaming an agent** — apply the same rules to `agents/<agent-name>.md` and the `## Agents` table.

The "When to use" column in `README.md` should be a short, human-readable rephrasing of the skill's frontmatter `description`. It does not have to be a verbatim copy, but it must not contradict it.

### How to verify sync

Before finishing any change that touches skills or agents:

1. List skill directories: `ls -1 skills | grep -v '^\.'`
2. Compare against the rows in the `## Skills` table in `README.md`.
3. Every directory must have exactly one row, and every row must point to an existing directory.
4. For each row, skim the corresponding `SKILL.md` frontmatter `description` and confirm the "When to use" column still matches.
5. Repeat steps 1–3 for `ls -1 agents` and the `## Agents` table.

If any of those checks fail, fix `README.md` (or the skill) before considering the task done.

## Skill file conventions

- Each skill lives in its own directory: `skills/<skill-name>/SKILL.md`. The directory name is the skill ID; frontmatter `name` is only a display label, so keep them identical.
- `SKILL.md` starts with YAML frontmatter containing `name` and `description`. OpenCode shows the description to the model to decide when to load the skill, and does not advertise skills without one, so keep it precise and trigger-oriented.
- Frontmatter also sets `metadata.opencode/autoinvoke` explicitly. Use `true` so the model sees the skill in its available list, or `false` to hide it so it loads only when invoked by ID.
- Supporting files (references, templates, examples) live alongside `SKILL.md` in the same directory and are referenced by relative path.

## Skill authoring

Follow Anthropic's [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices):

- Name skills in gerund form (`committing-changes`, `debugging-systematically`): lowercase letters, numbers, and hyphens, at most 64 characters.
- Write the description in third person: first what the skill does, then `Use when …` or `Use before …` with the concrete triggers. Do not address the model as "you"; stay under 1,024 characters.
- Add only what the model does not already know. Do not explain how to read files or run commands; keep tool guidance for non-obvious routing, such as `shell` with `background: true` for services or the `browser` namespace through `execute`.
- Keep `SKILL.md` under 500 lines. Move conditional detail into a supporting file linked directly from `SKILL.md`, never from another supporting file. Start supporting files longer than 100 lines with a `## Contents` list.
- Give multi-step workflows a short progress checklist, and close validation steps with an explicit loop back to the fix.
- Use concrete examples where output quality depends on style, such as commit messages and pull request bodies.
- Refer to another skill as "Load the `<skill-id>` skill" so the model treats it as a skill load rather than a tool or concept.

## Evaluations

Every skill has `evals/<skill-name>.json` with at least three scenarios. A scenario's `query` is a realistic user prompt that never names a skill. When adding, renaming, or removing a skill, update its eval file in the same change. After changing a description or a trigger, run the affected scenarios with `node evals/run.mjs <skill-name>` and report which expected skills loaded. The runner always hides the global `AGENTS.md` from OpenCode, so results reflect the skill descriptions alone. Runs call `opencode run` and take minutes each, so run them only when triggers changed.

The fixture `evals/fixtures/todo-api/` is a NestJS app with its own `package.json` and `pnpm-lock.yaml`. Run `pnpm` only in a temporary copy of the fixture, never in the fixture directory or the repository root, so no `node_modules` or `dist` lands in the repository. After changing the fixture, confirm `pnpm install --frozen-lockfile` and `pnpm verify` pass in a fresh copy, and `node evals/run.mjs <skill> --dry-run` still plants every scenario.

## Verification

The automated checks are formatting and the tests for scripts bundled with skills. Scripts use only Node.js built-ins; their tests live in `tests/` and replace `gh` with `tests/fake-gh.mjs`. After changing a bundled script, run:

```sh
node --test tests/*.test.mjs
```

The repository has no `package.json`; do not run `pnpm install`, `npm install`, or other package-manager commands, because they create untracked `package.json`, lockfile, and `node_modules` artifacts.

Before finishing any change, run Prettier through `npx` from the repository root:

```sh
npx --yes prettier@3 --check .
```

If it reports files, format them with `npx --yes prettier@3 --write <files>` and run the check again. Prettier reads `.prettierrc.json`.

## OpenCode conventions used in this repo

- OpenCode auto-loads `AGENTS.md` as project context. Prefer `AGENTS.md` for repository instructions.
- User skills are discovered under `~/.config/opencode/skills/` and project skills under `.opencode/skills/`. Commands come from `commands/*.md` and agents from `agents/*.md` in the same directories. Frontmatter for agents and commands follows the OpenCode V2 shape: `permissions` is an ordered list of `action`, `resource`, `effect` rules, and the Markdown body is the agent's system prompt or the command's template.
- Tool names in skills follow OpenCode's built-in surface: `read`, `glob`, `grep`, `edit`, `write`, `patch`, `shell`, `webfetch`, `websearch`, `question`, `skill`, `subagent`, and `execute` for Code Mode namespaces such as `browser`. Do not reference tools OpenCode lacks, such as `lsp`, `debug`, `hub`, or `ast_edit`.
