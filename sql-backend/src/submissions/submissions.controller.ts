import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ParseIntPipe
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubmissionsService } from './submissions.service';

@Controller('submissions')
@UseGuards(AuthGuard('jwt'))
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  // Student: Alle verfügbaren Worksheets anzeigen
  @Get('worksheets/available')
  async getAvailableWorksheets(@Request() req) {
    const userId = req.user.id;
    
    // Nur Studenten können Worksheets bearbeiten
    if (req.user.role !== 'STUDENT') {
      throw new ForbiddenException('Nur Studenten können Übungsblätter bearbeiten');
    }

    return this.submissionsService.getAvailableWorksheets(userId);
  }

  // Student: Worksheet für Bearbeitung laden
  @Get('worksheets/:worksheetId')
  async getWorksheetForSubmission(
    @Param('worksheetId', ParseIntPipe) worksheetId: number,
    @Request() req
  ) {
    const userId = req.user.id;
    
    if (req.user.role !== 'STUDENT') {
      throw new ForbiddenException('Nur Studenten können Übungsblätter bearbeiten');
    }

    return this.submissionsService.getWorksheetForSubmission(worksheetId, userId);
  }

  // Student: Submission erstellen oder aktualisieren
  @Post('worksheets/:worksheetId')
  async createOrUpdateSubmission(
    @Param('worksheetId', ParseIntPipe) worksheetId: number,
    @Body() submissionData: any,
    @Request() req
  ) {
    const userId = req.user.id;
    
    if (req.user.role !== 'STUDENT') {
      throw new ForbiddenException('Nur Studenten können Abgaben erstellen');
    }

    return this.submissionsService.createOrUpdateSubmission(worksheetId, userId, submissionData);
  }

  // Student: Submission final abgeben
  @Put('worksheets/:worksheetId/submit')
  async submitWorksheet(
    @Param('worksheetId', ParseIntPipe) worksheetId: number,
    @Request() req
  ) {
    const userId = req.user.id;
    
    if (req.user.role !== 'STUDENT') {
      throw new ForbiddenException('Nur Studenten können Abgaben einreichen');
    }

    return this.submissionsService.submitWorksheet(worksheetId, userId);
  }

  // Student: Eigene Submissions anzeigen
  @Get('my')
  async getMySubmissions(@Request() req) {
    const userId = req.user.id;
    
    if (req.user.role !== 'STUDENT') {
      throw new ForbiddenException('Nur Studenten können ihre Abgaben einsehen');
    }

    return this.submissionsService.getStudentSubmissions(userId);
  }

  // Tutor: Alle Submissions für eigene Worksheets anzeigen
  @Get('tutor/my')
  async getTutorSubmissions(@Request() req) {
    const tutorId = req.user.id;
    
    if (req.user.role !== 'TUTOR') {
      throw new ForbiddenException('Nur Tutoren können Abgaben einsehen');
    }

    return this.submissionsService.getTutorSubmissions(tutorId);
  }
  // Tutor: Spezifische Submission anzeigen
  @Get(':submissionId')
  async getSubmissionDetails(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Request() req
  ) {
    const tutorId = req.user.id;
    
    if (req.user.role !== 'TUTOR') {
      throw new ForbiddenException('Nur Tutoren können Abgaben einsehen');
    }

    return this.submissionsService.getSubmissionDetails(submissionId, tutorId);
  }
}
