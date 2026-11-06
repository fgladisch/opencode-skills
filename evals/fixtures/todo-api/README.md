# Todo API

A small in-memory todo REST API built on Node.js built-ins only.

- `npm start` listens on `PORT` (default 3000).
- `npm test` runs the HTTP tests with `node --test`.

| Method | Path         | Body                     |
| ------ | ------------ | ------------------------ |
| GET    | `/todos`     |                          |
| GET    | `/todos/:id` |                          |
| POST   | `/todos`     | `{ title, completed? }`  |
| PATCH  | `/todos/:id` | `{ title?, completed? }` |
| DELETE | `/todos/:id` |                          |
