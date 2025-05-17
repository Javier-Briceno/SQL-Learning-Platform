import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}


  /////////////     Implementierung der Register-Methode    /////////////
  

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Überprüfen, ob die E-Mail bereits existiert
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Die E-Mail wird bereits verwendet');
    }

    try {
      // Passwort hashen
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Neuen Benutzer erstellen
      const newUser = await this.prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name,
        },
        // Sensible Daten nicht zurückgeben
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return newUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Benutzerregistrierung fehlgeschlagen');
    }
  }
}
