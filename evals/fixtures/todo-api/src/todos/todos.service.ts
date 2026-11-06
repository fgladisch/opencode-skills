import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { CreateTodoDto } from "./dto/create-todo.dto";
import { UpdateTodoDto } from "./dto/update-todo.dto";
import type { Todo } from "./todo";

@Injectable()
export class TodosService {
  private readonly todos = new Map<string, Todo>();

  findAll(): Todo[] {
    return [...this.todos.values()];
  }

  findOne(id: string): Todo {
    const todo = this.todos.get(id);
    if (!todo) throw new NotFoundException(`Todo ${id} not found`);
    return todo;
  }

  create({ title, completed = false }: CreateTodoDto): Todo {
    const todo: Todo = {
      id: randomUUID(),
      title: this.cleanTitle(title),
      completed,
    };
    this.todos.set(todo.id, todo);
    return todo;
  }

  update(id: string, { title, completed }: UpdateTodoDto): Todo {
    const todo = this.findOne(id);
    if (title !== undefined) todo.title = this.cleanTitle(title);
    if (completed !== undefined) todo.completed = completed;
    return todo;
  }

  remove(id: string): void {
    if (!this.todos.delete(id))
      throw new NotFoundException(`Todo ${id} not found`);
  }

  private cleanTitle(title: string): string {
    const trimmed = title.trim();
    if (trimmed === "")
      throw new BadRequestException("title must not be blank");
    return trimmed;
  }
}
