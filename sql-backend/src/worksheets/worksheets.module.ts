import { Module } from '@nestjs/common';
import { WorksheetsController } from './worksheets.controller';
import { WorksheetsService } from './worksheets.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorksheetsController],
  providers: [WorksheetsService],
  exports: [WorksheetsService],
})
export class WorksheetsModule {}
