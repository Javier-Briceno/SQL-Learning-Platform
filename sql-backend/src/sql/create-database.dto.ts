import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePostgresDbDto {
  @IsString()
  @IsNotEmpty()
  dbName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  sqlScript: string;
}

export class CreatePostgresDbResponse {
  dbName: string;
  success: boolean;
  message: string;
  tablesCreated?: string[];
}
