import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { WorksheetsService, CreateWorksheetDto, UpdateWorksheetDto, WorksheetWithTasks } from './worksheets.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('worksheets')
@UseGuards(AuthGuard('jwt'))
export class WorksheetsController {
  constructor(private readonly worksheetsService: WorksheetsService) {}
  // Alle Worksheets des aktuellen Tutors abrufen
  @Get('my')
  async getMyWorksheets(@Request() req): Promise<WorksheetWithTasks[]> {
    const tutorId = req.user.id; // Changed from req.user.sub to req.user.id
    return await this.worksheetsService.getWorksheetsByTutor(tutorId);
  }
  // Einzelnes Worksheet abrufen
  @Get(':id')
  async getWorksheet(
    @Param('id', ParseIntPipe) id: number,
    @Request() req
  ): Promise<WorksheetWithTasks> {
    const userId = req.user.id; // Changed from req.user.sub to req.user.id
    const userRole = req.user.role;

    // Tutoren und Admins können ihre eigenen Worksheets mit Lösungen sehen
    if (userRole === 'TUTOR' || userRole === 'ADMIN') {
      return await this.worksheetsService.getWorksheetById(id, userId);
    } else {
      // Studenten sehen Worksheets ohne Lösungen
      return await this.worksheetsService.getWorksheetById(id);
    }
  }// Neues Worksheet erstellen (nur für Tutoren/Admins)
  @Post()
  async createWorksheet(
    @Body() createWorksheetDto: CreateWorksheetDto,
    @Request() req
  ): Promise<WorksheetWithTasks> {
    try {
      console.log('Controller: Creating worksheet for user:', req.user);
      console.log('Controller: Request body:', createWorksheetDto);
      
      const tutorId = req.user.id; // Changed from req.user.sub to req.user.id
      
      if (!tutorId) {
        throw new BadRequestException('Benutzer-ID nicht gefunden im Token.');
      }
      
      if (!req.user.role || (req.user.role !== 'TUTOR' && req.user.role !== 'ADMIN')) {
        throw new ForbiddenException('Nur Tutoren und Admins können Übungsblätter erstellen.');
      }
      
      const result = await this.worksheetsService.createWorksheet(tutorId, createWorksheetDto);
      console.log('Controller: Worksheet created successfully');
      return result;
    } catch (error) {
      console.error('Controller Error in createWorksheet:', error);
      
      // If it's already a known HTTP exception, re-throw it
      if (error.status) {
        throw error;
      }
      
      // Handle unexpected errors
      throw new BadRequestException(`Unbekannter Fehler: ${error.message}`);
    }
  }
  // Worksheet aktualisieren (nur für Tutoren/Admins)
  @Put(':id')
  async updateWorksheet(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWorksheetDto: UpdateWorksheetDto,
    @Request() req
  ): Promise<WorksheetWithTasks> {
    const tutorId = req.user.id; // Changed from req.user.sub to req.user.id
    return await this.worksheetsService.updateWorksheet(id, tutorId, updateWorksheetDto);
  }
  // Worksheet löschen (nur für Tutoren/Admins)
  @Delete(':id')
  async deleteWorksheet(
    @Param('id', ParseIntPipe) id: number,
    @Request() req
  ): Promise<{ message: string }> {
    const tutorId = req.user.id; // Changed from req.user.sub to req.user.id
    await this.worksheetsService.deleteWorksheet(id, tutorId);
    return { message: 'Übungsblatt erfolgreich gelöscht.' };
  }

  // Verfügbare Datenbanken abrufen
  @Get('databases/available')
  async getAvailableDatabases(): Promise<string[]> {
    return await this.worksheetsService.getAvailableDatabases();
  }
  // Öffentliche Worksheets für Studenten
  @Get('public/all')
  async getPublicWorksheets(): Promise<WorksheetWithTasks[]> {
    return await this.worksheetsService.getPublicWorksheets();
  }

  // Debug-Route um JWT Token zu prüfen
  @Get('debug/user')
  async debugUser(@Request() req): Promise<any> {
    return {
      user: req.user,
      headers: req.headers,
      timestamp: new Date().toISOString()
    };
  }
}
