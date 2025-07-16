import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SubmissionAnswer {
  taskId: number;
  content: string;
}

export interface SubmissionData {
  answers: SubmissionAnswer[];
}

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

  // Alle verfügbaren Worksheets für Studenten
  async getAvailableWorksheets(studentId: number) {
    try {
      const worksheets = await this.prisma.worksheet.findMany({
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          tasks: {
            select: {
              id: true,
              title: true,
              taskType: true,
              orderIndex: true
            },
            orderBy: {
              orderIndex: 'asc'
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Prüfe für jedes Worksheet, ob bereits eine Submission existiert
      const worksheetsWithSubmissionStatus = await Promise.all(
        worksheets.map(async (worksheet) => {          const submission = await this.prisma.submission.findUnique({
            where: {
              worksheetId_studentId: {
                worksheetId: worksheet.id,
                studentId: studentId
              }
            },
            select: {
              id: true,
              status: true,
              submittedAt: true,
              updatedAt: true
            }
          });

          return {
            ...worksheet,
            submission: submission || null,
            hasSubmission: !!submission,
            isSubmitted: submission?.status === 'SUBMITTED'
          };
        })
      );

      console.log(`Gefunden: ${worksheetsWithSubmissionStatus.length} Worksheets für Student ${studentId}`);
      return worksheetsWithSubmissionStatus;
    } catch (error) {
      console.error('Fehler beim Laden der verfügbaren Worksheets:', error);
      throw new BadRequestException('Fehler beim Laden der verfügbaren Übungsblätter');
    }
  }

  // Worksheet für Submission laden (mit vorhandenen Antworten falls vorhanden)
  async getWorksheetForSubmission(worksheetId: number, studentId: number) {
    try {
      // Worksheet mit Tasks laden
      const worksheet = await this.prisma.worksheet.findUnique({
        where: { id: worksheetId },
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },          tasks: {
            select: {
              id: true,
              title: true,
              description: true,
              taskType: true,
              orderIndex: true
            },
            orderBy: {
              orderIndex: 'asc'
            }
          }
        }
      });

      if (!worksheet) {
        throw new NotFoundException('Übungsblatt nicht gefunden');
      }      // Prüfe ob bereits eine Submission existiert
      const submission = await this.prisma.submission.findUnique({
        where: {
          worksheetId_studentId: {
            worksheetId: worksheetId,
            studentId: studentId
          }
        },
        include: {
          answers: {
            include: {
              task: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        }
      });// Erstelle Map der vorhandenen Antworten
      const answersMap = new Map();
      if (submission) {
        submission.answers.forEach(answer => {
          answersMap.set(answer.taskId, answer.content);
        });
      }

      // Füge Antworten zu Tasks hinzu
      const tasksWithAnswers = worksheet.tasks.map(task => ({
        ...task,
        studentAnswer: answersMap.get(task.id) || '',
        hasAnswer: answersMap.has(task.id)
      }));

      const result = {
        ...worksheet,
        tasks: tasksWithAnswers,
        submission: submission ? {
          id: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt,
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt
        } : null,
        isSubmitted: submission?.status === 'SUBMITTED',
        canEdit: !submission || submission.status === 'DRAFT'
      };

      console.log(`Worksheet ${worksheetId} für Student ${studentId} geladen. Status: ${submission?.status || 'Neu'}`);
      return result;
    } catch (error) {
      console.error('Fehler beim Laden des Worksheets für Submission:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Fehler beim Laden des Übungsblatts');
    }
  }

  // Submission erstellen oder aktualisieren
  async createOrUpdateSubmission(worksheetId: number, studentId: number, submissionData: SubmissionData) {
    try {
      // Prüfe ob Worksheet existiert
      const worksheet = await this.prisma.worksheet.findUnique({
        where: { id: worksheetId },
        include: {
          tasks: {
            select: { id: true }
          }
        }
      });

      if (!worksheet) {
        throw new NotFoundException('Übungsblatt nicht gefunden');
      }

      // Validiere dass alle Task-IDs zum Worksheet gehören
      const validTaskIds = new Set(worksheet.tasks.map(task => task.id));
      const invalidAnswers = submissionData.answers.filter(answer => !validTaskIds.has(answer.taskId));
      
      if (invalidAnswers.length > 0) {
        throw new BadRequestException('Ungültige Aufgaben-IDs in den Antworten');
      }      // Prüfe existierende Submission
      let submission = await this.prisma.submission.findUnique({
        where: {
          worksheetId_studentId: {
            worksheetId: worksheetId,
            studentId: studentId
          }
        }
      });

      // Wenn bereits submitted, erlaube keine Änderungen
      if (submission && submission.status === 'SUBMITTED') {
        throw new ForbiddenException('Bereits abgegebene Übungsblätter können nicht mehr bearbeitet werden');
      }

      return await this.prisma.$transaction(async (prisma) => {
        // Submission erstellen oder aktualisieren
        if (!submission) {
          submission = await prisma.submission.create({
            data: {
              studentId: studentId,
              userId: studentId, 
              worksheetId: worksheetId,
              status: "in_progress"
            }
          });
        } else {
          submission = await prisma.submission.update({
            where: { id: submission.id },
            data: {
              updatedAt: new Date()
            }
          });
        }

        // Alle existierenden Antworten löschen
        await prisma.answer.deleteMany({
          where: { submissionId: submission.id }
        });        // Neue Antworten erstellen
        if (submissionData.answers.length > 0) {
          await prisma.answer.createMany({
            data: submissionData.answers.map(answer => ({
              submissionId: submission!.id,
              taskId: answer.taskId,
              content: answer.content
            }))
          });
        }

        console.log(`Submission ${submission.id} für Worksheet ${worksheetId} und Student ${studentId} gespeichert`);
        
        return {
          id: submission.id,
          status: submission.status,
          message: 'Antworten erfolgreich gespeichert'
        };
      });
    } catch (error) {
      console.error('Fehler beim Speichern der Submission:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Fehler beim Speichern der Antworten');
    }
  }
  // Submission final abgeben
  async submitWorksheet(worksheetId: number, studentId: number) {
    try {
      const submission = await this.prisma.submission.findUnique({
        where: {
          worksheetId_studentId: {
            worksheetId: worksheetId,
            studentId: studentId
          }
        }
      });

      if (!submission) {
        throw new NotFoundException('Keine Bearbeitung für dieses Übungsblatt gefunden');
      }

      if (submission.status === 'SUBMITTED') {
        throw new BadRequestException('Übungsblatt wurde bereits abgegeben');
      }

      const updatedSubmission = await this.prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date()
        }
      });

      console.log(`Submission ${submission.id} für Worksheet ${worksheetId} von Student ${studentId} abgegeben`);
      
      return {
        id: updatedSubmission.id,
        status: updatedSubmission.status,
        submittedAt: updatedSubmission.submittedAt,
        message: 'Übungsblatt erfolgreich abgegeben'
      };
    } catch (error) {
      console.error('Fehler beim Abgeben der Submission:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Fehler beim Abgeben des Übungsblatts');
    }
  }

  // Submissions eines Studenten
  async getStudentSubmissions(studentId: number) {
    try {
      const submissions = await this.prisma.submission.findMany({
        where: { studentId: studentId },
        include: {
          worksheet: {
            include: {
              tutor: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              _count: {
                select: {
                  tasks: true
                }
              }
            }
          },
          _count: {
            select: {
              answers: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      console.log(`Gefunden: ${submissions.length} Submissions für Student ${studentId}`);
      return submissions;
    } catch (error) {
      console.error('Fehler beim Laden der Student Submissions:', error);
      throw new BadRequestException('Fehler beim Laden der Abgaben');
    }
  }

  // Submissions für Tutor (alle Submissions für seine Worksheets)
  async getTutorSubmissions(tutorId: number) {
    try {
      const submissions = await this.prisma.submission.findMany({
        where: {
          worksheet: {
            tutorId: tutorId
          }
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          worksheet: {
            select: {
              id: true,
              title: true,
              description: true,
              database: true,
              _count: {
                select: {
                  tasks: true
                }
              }
            }
          },
          _count: {
            select: {
              answers: true
            }
          }
        },
        orderBy: [
          { status: 'asc' }, // DRAFT zuerst, dann SUBMITTED
          { updatedAt: 'desc' }
        ]
      });

      console.log(`Gefunden: ${submissions.length} Submissions für Tutor ${tutorId}`);
      return submissions;
    } catch (error) {
      console.error('Fehler beim Laden der Tutor Submissions:', error);
      throw new BadRequestException('Fehler beim Laden der Abgaben');
    }
  }

  // Details einer spezifischen Submission für Tutor
  async getSubmissionDetails(submissionId: number, tutorId: number) {
    try {
      const submission = await this.prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          worksheet: {
            include: {
              tutor: {
                select: {
                  id: true,
                  name: true
                }
              },              tasks: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  taskType: true,
                  orderIndex: true
                },
                orderBy: {
                  orderIndex: 'asc'
                }
              }
            }
          },
          answers: {
            include: {              task: {
                select: {
                  id: true,
                  title: true,
                  taskType: true
                }
              }
            }
          }
        }
      });

      if (!submission) {
        throw new NotFoundException('Abgabe nicht gefunden');
      }

      // Prüfe ob Submission zu einem Worksheet des Tutors gehört
      if (submission.worksheet.tutorId !== tutorId) {
        throw new ForbiddenException('Sie können nur Abgaben Ihrer eigenen Übungsblätter einsehen');
      }

      // Erstelle Map der Antworten
      const answersMap = new Map();
      submission.answers.forEach(answer => {
        answersMap.set(answer.taskId, answer);
      });      // Kombiniere Tasks mit Antworten
      const tasksWithAnswers = submission.worksheet.tasks.map(task => ({
        ...task,
        studentAnswer: answersMap.get(task.id)?.content || '',
        hasAnswer: answersMap.has(task.id)
      }));

      const result = {
        ...submission,
        worksheet: {
          ...submission.worksheet,
          tasks: tasksWithAnswers
        }
      };

      console.log(`Submission Details ${submissionId} für Tutor ${tutorId} geladen`);
      return result;
    } catch (error) {
      console.error('Fehler beim Laden der Submission Details:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Fehler beim Laden der Abgabe-Details');
    }
  }
}
