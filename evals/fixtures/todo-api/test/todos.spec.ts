import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import type { Todo } from "../src/todos/todo";

describe("Todos API", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function createTodo(body: object): Promise<Todo> {
    const res = await request(app.getHttpServer())
      .post("/todos")
      .send(body)
      .expect(201);
    return res.body as Todo;
  }

  describe("POST /todos", () => {
    it("creates a todo with a trimmed title and completed false by default", async () => {
      const todo = await createTodo({ title: "  Buy milk  " });
      expect(todo.title).toBe("Buy milk");
      expect(todo.completed).toBe(false);
      expect(typeof todo.id).toBe("string");
    });

    it("accepts an explicit completed value", async () => {
      const todo = await createTodo({ title: "Done already", completed: true });
      expect(todo.completed).toBe(true);
    });

    it("rejects an empty or blank title", async () => {
      const server = app.getHttpServer();
      await request(server).post("/todos").send({ title: "" }).expect(400);
      await request(server).post("/todos").send({ title: "   " }).expect(400);
    });

    it("rejects a non-string title", async () => {
      await request(app.getHttpServer())
        .post("/todos")
        .send({ title: 42 })
        .expect(400);
    });

    it("rejects a non-boolean completed", async () => {
      await request(app.getHttpServer())
        .post("/todos")
        .send({ title: "x", completed: "yes" })
        .expect(400);
    });

    it("rejects unknown fields", async () => {
      await request(app.getHttpServer())
        .post("/todos")
        .send({ title: "x", owner: "me" })
        .expect(400);
    });
  });

  describe("GET /todos", () => {
    it("lists created todos", async () => {
      const todo = await createTodo({ title: "Listed" });
      const res = await request(app.getHttpServer()).get("/todos").expect(200);
      expect(res.body).toEqual([todo]);
    });
  });

  describe("GET /todos/:id", () => {
    it("returns a todo by id", async () => {
      const todo = await createTodo({ title: "Find me" });
      const res = await request(app.getHttpServer())
        .get(`/todos/${todo.id}`)
        .expect(200);
      expect(res.body).toEqual(todo);
    });

    it("returns 404 for an unknown id", async () => {
      await request(app.getHttpServer()).get("/todos/missing").expect(404);
    });
  });

  describe("PATCH /todos/:id", () => {
    it("updates and trims the title", async () => {
      const todo = await createTodo({ title: "Old" });
      const res = await request(app.getHttpServer())
        .patch(`/todos/${todo.id}`)
        .send({ title: " New " })
        .expect(200);
      expect(res.body).toEqual({ ...todo, title: "New" });
    });

    it("marks a todo as completed", async () => {
      const todo = await createTodo({ title: "Finish" });
      const res = await request(app.getHttpServer())
        .patch(`/todos/${todo.id}`)
        .send({ completed: true })
        .expect(200);
      expect(res.body).toEqual({ ...todo, completed: true });
    });

    it("rejects invalid fields", async () => {
      const todo = await createTodo({ title: "Valid" });
      const server = app.getHttpServer();
      await request(server)
        .patch(`/todos/${todo.id}`)
        .send({ title: "" })
        .expect(400);
      await request(server)
        .patch(`/todos/${todo.id}`)
        .send({ completed: 1 })
        .expect(400);
    });

    it("returns 404 for an unknown id", async () => {
      await request(app.getHttpServer())
        .patch("/todos/missing")
        .send({ title: "x" })
        .expect(404);
    });
  });

  describe("DELETE /todos/:id", () => {
    it("deletes a todo", async () => {
      const todo = await createTodo({ title: "Remove me" });
      const server = app.getHttpServer();
      await request(server).delete(`/todos/${todo.id}`).expect(204);
      await request(server).get(`/todos/${todo.id}`).expect(404);
    });

    it("returns 404 for an unknown id", async () => {
      await request(app.getHttpServer()).delete("/todos/missing").expect(404);
    });
  });

  it("returns 404 for unknown routes", async () => {
    await request(app.getHttpServer()).get("/nope").expect(404);
  });
});
