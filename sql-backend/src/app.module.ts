import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { SqlModule } from './sql/sql.module'; 
import { SqlController } from './sql/sql.controller';
import { SqlService } from './sql/sql.service'; 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Macht den ConfigService überall verfügbar
    }),
    AuthModule, 
    PrismaModule,
    SqlModule
  ],
  controllers: [AppController, SqlController],
  providers: [AppService, SqlService],
})
export class AppModule {}
