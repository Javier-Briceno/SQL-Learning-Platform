import { IsString, IsNotEmpty } from 'class-validator';

export class CheckQueryDto {
  @IsString()
  @IsNotEmpty()
  taskDescription: string;

  @IsString()
  @IsNotEmpty()
  sqlQuery: string;
}