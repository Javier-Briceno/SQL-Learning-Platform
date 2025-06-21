import { Controller, Post, Delete, Param, UploadedFile, Get, UseInterceptors, Body } from '@nestjs/common';
import { SqlService } from './sql.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { CheckQueryDto } from './check-query.dto';

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
  @UseInterceptors(FileInterceptor('file'))
  async importSqlFile(@UploadedFile() file: Multer.File) {
    const sql = file.buffer.toString('utf8');
    return this.sqlService.executeSqlFile(sql);
  }

  @Get('databases')
  async getAllDatabases() {
    return await this.sqlService.listDatabases();
  }

  @Delete('delete/:dbName')
  async deleteDatabaseAlternative(@Param('dbName') dbName: string) {
    return this.sqlService.deleteDatabase(dbName);
  }

  // Neue Route für Query Execution
  @Post('execute')
  async executeQuery(@Body() queryDto: QueryExecuteDto): Promise<QueryResult> {
    return await this.sqlService.executeQuery(queryDto.query, queryDto.database);
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
}


