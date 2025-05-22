import { Controller, Post, UploadedFile, Get, UseInterceptors } from '@nestjs/common';
import { SqlService } from './sql.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';


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
}


