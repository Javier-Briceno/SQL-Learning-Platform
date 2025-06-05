import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService, 
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}


  /////////////     Implementierung der Register-Methode    /////////////
  

  async register(registerDto: RegisterDto) {
    const { email, password, name, tutorKey } = registerDto;

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
      const hashedPassword = await bcrypt.hash(password, saltRounds);      // Standardrolle ist STUDENT
      let role: Role = Role.STUDENT;
      
      // Wenn ein Tutor-Key angegeben wurde, überprüfen, ob er gültig ist
      if (tutorKey) {
        const validTutorKey = this.configService.get<string>('TUTOR_REGISTRATION_KEY');
        
        if (tutorKey !== validTutorKey) {
          throw new ForbiddenException('Ungültiger Tutor-Registrierungsschlüssel');
        }
        
        // Wenn der Tutor-Key gültig ist, setze die Rolle auf TUTOR
        role = Role.TUTOR;
      }

      // Neuen Benutzer erstellen
      const newUser = await this.prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name,
          role
        },
        // Sensible Daten nicht zurückgeben
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
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
  async getAllStudents() {
    return this.prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        name: true,
      },
    });
  }
}
