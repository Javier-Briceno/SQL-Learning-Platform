import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { SqlModule } from './sql/sql.module'; 
import { WorksheetsModule } from './worksheets/worksheets.module';
import { SubmissionsModule } from './submissions/submissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Macht den ConfigService überall verfügbar
    }),
    AuthModule, 
    PrismaModule,
    SqlModule,
    WorksheetsModule,
    SubmissionsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
