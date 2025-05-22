import { Module } from '@nestjs/common';
import { SqlController } from './sql.controller'; 
import { SqlService } from './sql.service';
import { PrismaModule } from '../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule], 
  controllers: [SqlController], 
  providers: [SqlService],    
})
export class SqlModule {}