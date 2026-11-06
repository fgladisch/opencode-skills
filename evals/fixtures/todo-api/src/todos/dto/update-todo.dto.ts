import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
