import { createServer } from "node:http";
import { createStore } from "./store.js";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, body) {
  if (body === undefined) {
    res.writeHead(status).end();
    return;
  }
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

function validate(body, { partial }) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Body must be a JSON object");
  }
  const { title, completed } = body;
  if (!partial || title !== undefined) {
    if (typeof title !== "string" || title.trim() === "") {
      throw new HttpError(400, "title must be a non-empty string");
    }
  }
  if (completed !== undefined && typeof completed !== "boolean") {
    throw new HttpError(400, "completed must be a boolean");
  }
  return { title, completed };
}

export function createApp(store = createStore()) {
  async function handle(req, res) {
    const { pathname } = new URL(req.url, "http://localhost");
    const match = pathname.match(/^\/todos(?:\/([^/]+))?$/);
    if (!match) throw new HttpError(404, "Not found");
    const id = match[1];

    if (id === undefined) {
      if (req.method === "GET") return send(res, 200, store.list());
      if (req.method === "POST") {
        const input = validate(await readJson(req), { partial: false });
        return send(res, 201, store.create(input));
      }
      throw new HttpError(404, "Not found");
    }

    if (req.method === "GET") {
      const todo = store.get(id);
      if (!todo) throw new HttpError(404, "Todo not found");
      return send(res, 200, todo);
    }
    if (req.method === "PATCH") {
      const input = validate(await readJson(req), { partial: true });
      const todo = store.update(id, input);
      if (!todo) throw new HttpError(404, "Todo not found");
      return send(res, 200, todo);
    }
    if (req.method === "DELETE") {
      if (!store.remove(id)) throw new HttpError(404, "Todo not found");
      return send(res, 204);
    }
    throw new HttpError(404, "Not found");
  }

  return createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      send(res, status, {
        error: status === 500 ? "Internal server error" : error.message,
      });
    }
  });
}
