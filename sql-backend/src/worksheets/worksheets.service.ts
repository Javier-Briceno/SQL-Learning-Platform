import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskType } from '@prisma/client';

// DTOs für Worksheet API
export interface CreateWorksheetDto {
  title: string;
  description?: string;
  database: string;
  tasks: CreateTaskDto[];
}

export interface CreateTaskDto {
  title: string;
  description: string;
  taskType: TaskType;
  orderIndex: number;
}

export interface UpdateWorksheetDto {
  title?: string;
  description?: string;
  database?: string;
  tasks?: UpdateTaskDto[];
}

export interface UpdateTaskDto {
  id?: number;
  title?: string;
  description?: string;
  taskType?: TaskType;
  orderIndex?: number;
  _action?: 'create' | 'update' | 'delete';
}

export interface WorksheetWithTasks {
  id: number;
  title: string;
  description: string | null;
  database: string;
  tutorId: number;
  tutor: {
    id: number;
    name: string;
    email: string;
  };
  tasks: TaskWithDetails[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWithDetails {
  id: number;
  title: string;
  description: string | null;  // Change from string to string | null
  taskType: TaskType;
  order: number;
  orderIndex: number;
  points: number;
  options: any;
  solution: string | null;
  worksheetId: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WorksheetsService {
  constructor(private readonly prisma: PrismaService) {}

  // Alle Worksheets eines Tutors abrufen
  async getWorksheetsByTutor(tutorId: number): Promise<WorksheetWithTasks[]> {
    const worksheets = await this.prisma.worksheet.findMany({
      where: { tutorId },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return worksheets;
  }

  // Einzelnes Worksheet mit Tasks abrufen
  async getWorksheetById(id: number, tutorId?: number): Promise<WorksheetWithTasks> {
    const worksheet = await this.prisma.worksheet.findUnique({
      where: { id },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!worksheet) {
      throw new NotFoundException(`Übungsblatt mit ID ${id} nicht gefunden.`);
    }

    // Überprüfe, ob der Tutor berechtigt ist (falls tutorId angegeben)
    if (tutorId && worksheet.tutorId !== tutorId) {
      throw new ForbiddenException('Sie sind nicht berechtigt, dieses Übungsblatt zu bearbeiten.');
    }

    return worksheet;
  }
  // Neues Worksheet erstellen
  async createWorksheet(tutorId: number, createWorksheetDto: CreateWorksheetDto): Promise<WorksheetWithTasks> {
    try {
      console.log('CreateWorksheet called with:', { tutorId, createWorksheetDto });

      const { title, description, database, tasks } = createWorksheetDto;

      // Validierung
      if (!title || title.trim().length === 0) {
        throw new BadRequestException('Titel darf nicht leer sein.');
      }

      if (!database || database.trim().length === 0) {
        throw new BadRequestException('Datenbank muss ausgewählt werden.');
      }

      // Überprüfe, ob der Tutor existiert
      const tutor = await this.prisma.user.findUnique({
        where: { id: tutorId },
      });

      if (!tutor) {
        throw new BadRequestException(`Tutor mit ID ${tutorId} existiert nicht.`);
      }

      if (tutor.role !== 'TUTOR' && tutor.role !== 'ADMIN') {
        throw new ForbiddenException('Nur Tutoren und Admins können Übungsblätter erstellen.');
      }

      console.log('Tutor validation passed:', tutor.email);

      // Überprüfe, ob die Datenbank existiert
      try {
        const managedDb = await this.prisma.managedDatabase.findUnique({
          where: { dbName: database },
        });

        if (!managedDb) {
          throw new BadRequestException(`Datenbank '${database}' ist nicht verfügbar.`);
        }
        console.log('Database validation passed:', database);
      } catch (dbError) {
        console.error('Database validation error:', dbError);
        throw new BadRequestException('Fehler bei der Datenbankvalidierung: ' + dbError.message);
      }      // Validiere Tasks
      if (tasks && tasks.length > 0) {
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          if (!task.title || task.title.trim().length === 0) {
            throw new BadRequestException(`Aufgabe ${i + 1}: Titel darf nicht leer sein.`);
          }
          if (!task.description || task.description.trim().length === 0) {
            throw new BadRequestException(`Aufgabe ${i + 1}: Beschreibung darf nicht leer sein.`);
          }
        }
        console.log('Tasks validation passed:', tasks.length, 'tasks');
      }

      // Worksheet mit Tasks erstellen
      console.log('Creating worksheet in database...');
      const worksheet = await this.prisma.worksheet.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          database: database.trim(),
          tutorId,          tasks: {
            create: tasks?.map(task => ({
            title: task.title,
            description: task.description,
            taskType: task.taskType,
            order: task.orderIndex || 0,      // Add this line
            orderIndex: task.orderIndex || 0,
          })) || [],
          },
        },
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          tasks: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      console.log('Worksheet created successfully:', worksheet.id);
      return worksheet;

    } catch (error) {
      console.error('Error in createWorksheet:', error);
      
      // Detaillierte Fehlerbehandlung
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error; // Re-throw custom exceptions
      }
      
      // Prisma spezifische Fehler
      if (error.code === 'P2002') {
        throw new BadRequestException('Ein Übungsblatt mit diesem Titel existiert bereits.');
      }
      
      if (error.code === 'P2003') {
        throw new BadRequestException('Ungültige Referenz: Tutor oder Datenbank existiert nicht.');
      }
      
      if (error.code === 'P2025') {
        throw new NotFoundException('Ressource nicht gefunden.');
      }
      
      // Database connection errors
      if (error.code === 'P1001') {
        throw new BadRequestException('Datenbankverbindung fehlgeschlagen. Bitte versuchen Sie es später erneut.');
      }
      
      // Allgemeine Prisma Fehler
      if (error.code && error.code.startsWith('P')) {
        throw new BadRequestException(`Datenbankfehler (${error.code}): ${error.message}`);
      }
      
      // Unbekannte Fehler
      throw new BadRequestException(`Unbekannter Fehler beim Erstellen des Übungsblatts: ${error.message}`);
    }
  }

  // Worksheet aktualisieren
  async updateWorksheet(id: number, tutorId: number, updateWorksheetDto: UpdateWorksheetDto): Promise<WorksheetWithTasks> {
    // Überprüfe, ob Worksheet existiert und dem Tutor gehört
    const existingWorksheet = await this.getWorksheetById(id, tutorId);

    const { title, description, database, tasks } = updateWorksheetDto;

    // Validierung
    if (title !== undefined && (!title || title.trim().length === 0)) {
      throw new BadRequestException('Titel darf nicht leer sein.');
    }

    if (database !== undefined) {
      if (!database || database.trim().length === 0) {
        throw new BadRequestException('Datenbank muss ausgewählt werden.');
      }

      // Überprüfe, ob die Datenbank existiert
      const managedDb = await this.prisma.managedDatabase.findUnique({
        where: { dbName: database },
      });

      if (!managedDb) {
        throw new BadRequestException(`Datenbank '${database}' ist nicht verfügbar.`);
      }
    }

    // Führe Updates in einer Transaktion aus
    const updatedWorksheet = await this.prisma.$transaction(async (prisma) => {
      // Basis-Worksheet-Daten aktualisieren
      const worksheetData: any = {};
      if (title !== undefined) worksheetData.title = title.trim();
      if (description !== undefined) worksheetData.description = description?.trim();
      if (database !== undefined) worksheetData.database = database.trim();

      if (Object.keys(worksheetData).length > 0) {
        await prisma.worksheet.update({
          where: { id },
          data: worksheetData,
        });
      }

      // Tasks aktualisieren, falls angegeben
      if (tasks) {
        for (const task of tasks) {
          if (task._action === 'delete' && task.id) {
            await prisma.task.delete({
              where: { id: task.id },
            });
          } else if (task._action === 'create') {
            if (!task.title || task.title.trim().length === 0) {
              throw new BadRequestException('Neue Aufgaben müssen einen Titel haben.');
            }
            if (!task.description || task.description.trim().length === 0) {
              throw new BadRequestException('Neue Aufgaben müssen eine Beschreibung haben.');
            }            await prisma.task.create({
              data: {
                worksheetId: id,
                title: task.title,
                description: task.description,
                taskType: task.taskType || TaskType.TEXT,
                order: task.orderIndex || 0,      // Add this line
                orderIndex: task.orderIndex || 0,
      },
            });          } else if (task._action === 'update' && task.id) {
            const taskData: any = {};
            if (task.title !== undefined) taskData.title = task.title.trim();
            if (task.description !== undefined) taskData.description = task.description.trim();
            if (task.taskType !== undefined) taskData.taskType = task.taskType;
            if (task.orderIndex !== undefined) taskData.orderIndex = task.orderIndex;

            if (Object.keys(taskData).length > 0) {
              await prisma.task.update({
                where: { id: task.id },
                data: taskData,
              });
            }
          }
        }
      }

      // Aktualisiertes Worksheet mit Tasks zurückgeben
      return await prisma.worksheet.findUnique({
        where: { id },
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          tasks: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    });

    return updatedWorksheet!;
  }

  // Worksheet löschen
  async deleteWorksheet(id: number, tutorId: number): Promise<void> {
    // Überprüfe, ob Worksheet existiert und dem Tutor gehört
    await this.getWorksheetById(id, tutorId);

    // Lösche Worksheet (Tasks werden durch CASCADE automatisch gelöscht)
    await this.prisma.worksheet.delete({
      where: { id },
    });
  }

  // Alle verfügbaren Datenbanken abrufen
  async getAvailableDatabases(): Promise<string[]> {
    const databases = await this.prisma.managedDatabase.findMany({
      select: { dbName: true },
      orderBy: { dbName: 'asc' },
    });

    return databases.map(db => db.dbName);
  }
  // Öffentlich zugängliche Worksheets (für Studenten)
  async getPublicWorksheets(): Promise<WorksheetWithTasks[]> {
    const worksheets = await this.prisma.worksheet.findMany({
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          orderBy: { orderIndex: 'asc' },
             select: {
          id: true,
          title: true,
          description: true,
          taskType: true,
          order: true,       
          orderIndex: true,
          points: true,          
          options: true,        
          worksheetId: true,     
          createdAt: true,
          updatedAt: true,
            // Lösung für Studenten ausblenden - don't include solution field
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Map the results to match our interface, adding null for solution
    return worksheets.map(worksheet => ({
      ...worksheet,
      tasks: worksheet.tasks.map(task => ({
        ...task,
        solution: null, // Set solution to null for students
      })),
    }));
  }
}
