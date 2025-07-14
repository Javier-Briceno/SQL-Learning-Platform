import { Controller, Post, Delete, Param, UploadedFile, Get, UseInterceptors, Body, UseGuards, Request } from '@nestjs/common';
import { SqlService } from './sql.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { CheckQueryDto } from './check-query.dto';
import { GenerateTaskDto } from './generate-task.dto';
import { CreatePostgresDbDto, CreatePostgresDbResponse } from './create-database.dto';
import { AuthGuard } from '@nestjs/passport';

// DTOs für Query Execution
interface QueryExecuteDto {
  query: string;
  database: string;
}

interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime?: number;
}

@Controller('sql')
export class SqlController {

  constructor(private readonly sqlService: SqlService) { }

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async importSqlFile(@UploadedFile() file: Multer.File, @Request() req) {
    const sql = file.buffer.toString('utf8');
    const ownerId = req.user.id; // Tutor-ID aus JWT
    return this.sqlService.executeSqlFile(sql, ownerId);
  }

  // Neue Route für manuelle PostgreSQL-Datenbank-Erstellung
  @Post('create-database')
  @UseGuards(AuthGuard('jwt'))
  async createDatabase(@Body() createDbDto: CreatePostgresDbDto, @Request() req): Promise<CreatePostgresDbResponse> {
    return this.sqlService.createPostgresDatabase(createDbDto, req.user.id);
  }

  @Get('databases')
  @UseGuards(AuthGuard('jwt'))
  async getAllDatabases(@Request() req) {
    return await this.sqlService.listDatabases(req.user.id);
}

  @Delete('delete/:dbName')
  async deleteDatabaseAlternative(@Param('dbName') dbName: string) {
    return this.sqlService.deleteDatabase(dbName);
  }

  // Neue Route für Query Execution
  @Post('execute')
  @UseGuards(AuthGuard('jwt'))
  async executeQuery(@Body() queryDto: QueryExecuteDto, @Request() req): Promise<QueryResult> {
    return this.sqlService.executeQuery(queryDto.query, queryDto.database, req.user.id);
}

  @Post('check-query-matches-task')
  async checkQueryMatchesTask(@Body() dto: CheckQueryDto): Promise<{ matches: boolean, aiAnswer: string }> {
  try {
    if (!dto.taskDescription || !dto.sqlQuery) {
      return { matches: false, aiAnswer: 'Fehlende Eingaben.' };
    }
    const { matches, aiAnswer } = await this.sqlService.checkQueryMatchesTask(dto.taskDescription, dto.sqlQuery);
    return { matches, aiAnswer };
  } catch (error) {
    return { matches: false, aiAnswer: 'Fehler bei der KI-Überprüfung.' };
  }
}

  @Get('inspect/:dbName')
  async inspectDatabase(@Param('dbName') dbName: string) {
  return this.sqlService.inspectDatabase(dbName);
}

  // Neue Route für PostgreSQL-Schema-Inspektion
  @Get('inspect-postgres/:dbName')
  @UseGuards(AuthGuard('jwt'))
  async inspectPostgresDatabase(@Param('dbName') dbName: string, @Request() req) {
    return this.sqlService.inspectPostgresDatabase(dbName, req.user.id);
  }

  // Route zum Generieren von Aufgaben per KI
  @Post('generate-task')
  async generateTask(@Body() dto: GenerateTaskDto): Promise<{ task: string, aiAnswer: string }> {
    // Überprüfen, ob die Eingaben vorhanden sind
    try {
      if (!dto.topic || !dto.difficulty || !dto.database) {
        return { task: '', aiAnswer: 'Fehlende Eingaben.' };
      }
      // Aufruf der Service-Methode zur Generierung der Aufgabe
      const { taskDescription, sqlQuery } = await this.sqlService.generateTask(dto.topic, dto.difficulty, dto.database);
      // Rückgabe der generierten Aufgabe und der SQL-Abfrage
      return { task: taskDescription, aiAnswer: sqlQuery };
    } catch (error) {
      // Fehlerbehandlung
      return { task: '', aiAnswer: 'Fehler bei der KI-Aufgabenerstellung.' };
    }
  }
}


