import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [AuthService],
  imports: [PrismaModule]
})
export class AuthModule {}
