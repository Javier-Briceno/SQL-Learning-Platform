import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}


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

    /////////////     Implementierung der Login-Methode    /////////////

    async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      sub: user.id, 
      email: user.email,
      role: user.role 
    };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async getUserProfile(userId: number) {
  return this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
}
