import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Task {
  id: number;
  title: string;
  description: string;
  taskType: 'TEXT' | 'KNOWLEDGE';
  solution: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface Tutor {
  id: number;
  name: string;
  email: string;
}

interface Worksheet {
  id: number;
  title: string;
  description: string | null;
  database: string;
  tutorId: number;
  tutor: Tutor;
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
}

@Component({
  selector: 'app-worksheet-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule,
    MatDialogModule,
    MatMenuModule,
    MatToolbarModule,
    MatTooltipModule
  ],
  templateUrl: './worksheet-overview.component.html',
  styleUrl: './worksheet-overview.component.scss'
})
export class WorksheetOverviewComponent implements OnInit {
  private baseUrl = 'http://localhost:3000/worksheets';
  
  worksheets: Worksheet[] = [];
  isLoading = false;
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadWorksheets();
  }
  // Lade alle Worksheets des Tutors
  loadWorksheets(): void {
    this.isLoading = true;
    console.log('Loading worksheets from:', `${this.baseUrl}/my`);
    
    this.http.get<Worksheet[]>(`${this.baseUrl}/my`)
      .subscribe({
        next: (worksheets) => {
          console.log('Worksheets loaded successfully:', worksheets);
          this.worksheets = worksheets.sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          this.isLoading = false;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Laden der Worksheets:', err);
          
          let errorMessage = 'Fehler beim Laden der Übungsblätter';
          
          if (err.status === 401) {
            errorMessage = 'Sie sind nicht angemeldet. Bitte loggen Sie sich erneut ein.';
            this.router.navigate(['/auth/login']);
          } else if (err.status === 403) {
            errorMessage = 'Sie haben keine Berechtigung, Übungsblätter anzuzeigen.';
          } else if (err.status === 500) {
            errorMessage = 'Serverfehler beim Laden der Übungsblätter. Bitte versuchen Sie es später erneut.';
          } else if (err.status === 0) {
            errorMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.';
          }
          
          console.error('Detaillierter Fehler:', {
            status: err.status,
            message: err.error?.message,
            url: err.url
          });
          
          this.snackBar.open(errorMessage, 'OK', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  // Neues Worksheet erstellen
  createWorksheet(): void {
    this.router.navigate(['/tutor-dashboard/worksheets/new']);
  }

  // Worksheet bearbeiten
  editWorksheet(id: number): void {
    this.router.navigate(['/tutor-dashboard/worksheets/edit', id]);
  }

  // Worksheet duplizieren
  duplicateWorksheet(worksheet: Worksheet): void {
    const duplicatedWorksheet = {
      title: `${worksheet.title} (Kopie)`,
      description: worksheet.description,
      database: worksheet.database,
      tasks: worksheet.tasks.map(task => ({
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        solution: task.solution,
        orderIndex: task.orderIndex
      }))
    };

    this.http.post<Worksheet>(this.baseUrl, duplicatedWorksheet)
      .subscribe({
        next: (newWorksheet) => {
          this.snackBar.open('Übungsblatt erfolgreich dupliziert', 'OK', { duration: 3000 });
          this.loadWorksheets(); // Neu laden
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Duplizieren:', err);
          this.snackBar.open('Fehler beim Duplizieren des Übungsblatts', 'OK', { duration: 3000 });
        }
      });
  }

  // Worksheet löschen
  deleteWorksheet(id: number, title: string): void {
    if (confirm(`Möchten Sie das Übungsblatt "${title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      this.http.delete(`${this.baseUrl}/${id}`)
        .subscribe({
          next: () => {
            this.snackBar.open('Übungsblatt erfolgreich gelöscht', 'OK', { duration: 3000 });
            this.loadWorksheets(); // Neu laden
          },
          error: (err: HttpErrorResponse) => {
            console.error('Fehler beim Löschen:', err);
            this.snackBar.open('Fehler beim Löschen des Übungsblatts', 'OK', { duration: 3000 });
          }
        });
    }
  }  // Worksheet-Vorschau für Studenten
  previewWorksheet(id: number): void {
    this.router.navigate(['/tutor-dashboard/worksheets/preview', id]);
  }

  // Formatiere Datum
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Zähle Aufgaben nach Typ
  getTaskStats(worksheet: Worksheet): { text: number; knowledge: number; total: number } {
    const textTasks = worksheet.tasks.filter(t => t.taskType === 'TEXT').length;
    const knowledgeTasks = worksheet.tasks.filter(t => t.taskType === 'KNOWLEDGE').length;
    
    return {
      text: textTasks,
      knowledge: knowledgeTasks,
      total: worksheet.tasks.length
    };
  }

  // Zurück zum Dashboard
  goBackToDashboard(): void {
    this.router.navigate(['/tutor-dashboard']);
  }
}
