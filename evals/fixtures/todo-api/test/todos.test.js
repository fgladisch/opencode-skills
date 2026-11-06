import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

function request(method, path, body) {
  const init = { method };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return fetch(baseUrl + path, init);
}

async function createTodo(body) {
  const res = await request("POST", "/todos", body);
  assert.equal(res.status, 201);
  return res.json();
}

describe("POST /todos", () => {
  it("creates a todo with a trimmed title and completed false by default", async () => {
    const todo = await createTodo({ title: "  Buy milk  " });
    assert.equal(todo.title, "Buy milk");
    assert.equal(todo.completed, false);
    assert.equal(typeof todo.id, "string");
  });

  it("accepts an explicit completed value", async () => {
    const todo = await createTodo({ title: "Done already", completed: true });
    assert.equal(todo.completed, true);
  });

  it("rejects a missing or blank title", async () => {
    assert.equal((await request("POST", "/todos", {})).status, 400);
    assert.equal(
      (await request("POST", "/todos", { title: "   " })).status,
      400,
    );
  });

  it("rejects a non-boolean completed", async () => {
    const res = await request("POST", "/todos", {
      title: "x",
      completed: "yes",
    });
    assert.equal(res.status, 400);
  });

  it("rejects invalid JSON", async () => {
    const res = await request("POST", "/todos", "{not json");
    assert.equal(res.status, 400);
  });
});

describe("GET /todos", () => {
  it("lists created todos", async () => {
    const todo = await createTodo({ title: "Listed" });
    const res = await request("GET", "/todos");
    assert.equal(res.status, 200);
    const todos = await res.json();
    assert.ok(todos.some((t) => t.id === todo.id));
  });
});

describe("GET /todos/:id", () => {
  it("returns a todo by id", async () => {
    const todo = await createTodo({ title: "Find me" });
    const res = await request("GET", `/todos/${todo.id}`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), todo);
  });

  it("returns 404 for an unknown id", async () => {
    assert.equal((await request("GET", "/todos/missing")).status, 404);
  });
});

describe("PATCH /todos/:id", () => {
  it("updates the title", async () => {
    const todo = await createTodo({ title: "Old" });
    const res = await request("PATCH", `/todos/${todo.id}`, { title: " New " });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).title, "New");
  });

  it("marks a todo as completed", async () => {
    const todo = await createTodo({ title: "Finish" });
    const res = await request("PATCH", `/todos/${todo.id}`, {
      completed: true,
    });
    const updated = await res.json();
    assert.equal(updated.completed, true);
    assert.equal(updated.title, "Finish");
  });

  it("rejects invalid fields", async () => {
    const todo = await createTodo({ title: "Valid" });
    assert.equal(
      (await request("PATCH", `/todos/${todo.id}`, { title: "" })).status,
      400,
    );
    assert.equal(
      (await request("PATCH", `/todos/${todo.id}`, { completed: 1 })).status,
      400,
    );
  });

  it("returns 404 for an unknown id", async () => {
    assert.equal(
      (await request("PATCH", "/todos/missing", { title: "x" })).status,
      404,
    );
  });
});

describe("DELETE /todos/:id", () => {
  it("deletes a todo", async () => {
    const todo = await createTodo({ title: "Remove me" });
    assert.equal((await request("DELETE", `/todos/${todo.id}`)).status, 204);
    assert.equal((await request("GET", `/todos/${todo.id}`)).status, 404);
  });

  it("returns 404 for an unknown id", async () => {
    assert.equal((await request("DELETE", "/todos/missing")).status, 404);
  });
});

describe("unknown routes", () => {
  it("returns 404", async () => {
    assert.equal((await request("GET", "/nope")).status, 404);
  });
});
