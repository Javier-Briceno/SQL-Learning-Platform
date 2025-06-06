import { Controller, Post, Delete, Param, UploadedFile, Get, UseInterceptors, Body } from '@nestjs/common';
import { SqlService } from './sql.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';

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
}


