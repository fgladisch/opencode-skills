# Todo API

A small in-memory todo REST API built with NestJS 11 and TypeScript.

```sh
pnpm install
pnpm verify      # typecheck, lint, format check, tests, build
pnpm start       # listens on PORT (default 3000)
```

`pnpm test` runs the HTTP tests in `test/` with Jest and supertest.

| Method | Path         | Body                     |
| ------ | ------------ | ------------------------ |
| GET    | `/todos`     |                          |
| GET    | `/todos/:id` |                          |
| POST   | `/todos`     | `{ title, completed? }`  |
| PATCH  | `/todos/:id` | `{ title?, completed? }` |
| DELETE | `/todos/:id` |                          |
