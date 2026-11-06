import { randomUUID } from "node:crypto";

export function createStore() {
  const todos = new Map();

  return {
    list() {
      return [...todos.values()];
    },

    get(id) {
      return todos.get(id);
    },

    create({ title, completed = false }) {
      const todo = { id: randomUUID(), title: title.trim(), completed };
      todos.set(todo.id, todo);
      return todo;
    },

    update(id, { title, completed }) {
      const todo = todos.get(id);
      if (!todo) return undefined;
      if (title !== undefined) todo.title = title.trim();
      if (completed !== undefined) todo.completed = completed;
      return todo;
    },

    remove(id) {
      return todos.delete(id);
    },
  };
}
