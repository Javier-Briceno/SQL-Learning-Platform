import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { ConfirmSubmitDialogComponent } from './confirm-submit-dialog.component';

interface Task {
  id: number;
  title: string;
  description: string;
  taskType: 'TEXT';
  orderIndex: number;
  studentAnswer: string;
  hasAnswer: boolean;
}

interface WorksheetForSubmission {
  id: number;
  title: string;
  description?: string;
  database: string;
  tutor: {
    id: number;
    name: string;
    email: string;
  };
  tasks: Task[];
  submission?: {
    id: number;
    status: 'DRAFT' | 'SUBMITTED';
    submittedAt?: string;
    createdAt: string;
    updatedAt: string;
  };
  isSubmitted: boolean;
  canEdit: boolean;
}

interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime?: number;
}

interface QueryRequest {
  query: string;
  database: string;
}

interface SubmissionAnswer {
  taskId: number;
  content: string;
}

interface SubmissionData {
  answers: SubmissionAnswer[];
}

interface CheckQueryResult {
  matches: boolean;
  aiAnswer: string;
}

@Component({
  selector: 'app-student-worksheet',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule,
    MatStepperModule,
    MatDialogModule,
    MatTableModule
  ],
  templateUrl: './student-worksheet.component.html',
  styleUrl: './student-worksheet.component.scss'
})
export class StudentWorksheetComponent implements OnInit {
  private baseUrl = 'http://localhost:3000/submissions';
  private sqlBaseUrl = 'http://localhost:3000/sql';

  worksheetForm!: FormGroup;
  sqlForm!: FormGroup;
  worksheet: WorksheetForSubmission | null = null;
  worksheetId: number | null = null;
  
  // State
  isLoading = false;
  isSaving = false;
  isSubmitting = false;
  autoSaveEnabled = true;
  lastSaved: Date | null = null;
  autoSaveInterval: any;

  // SQL Executor State
  isExecutingSql = false;
  sqlResult: QueryResult | null = null;
  sqlError: string | null = null;

  isCheckingQuery = false;
  queryCheckResult: boolean | null = null;
  aiCheckResult: CheckQueryResult | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.worksheetId = +params['id'];
        this.loadWorksheet();
      }
    });

    // Auto-Save alle 30 Sekunden
    if (this.autoSaveEnabled) {
      this.autoSaveInterval = setInterval(() => {
        if (this.worksheet && this.worksheet.canEdit && this.worksheetForm.dirty) {
          this.saveAnswers(true); // Silent save
        }
      }, 30000);
    }
  }

  ngOnDestroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }
  private initializeForm(): void {
    this.worksheetForm = this.fb.group({
      answers: this.fb.array([])
    });
    
    this.sqlForm = this.fb.group({
      query: ['', Validators.required]
    });
  }

  get answersFormArray(): FormArray {
    return this.worksheetForm.get('answers') as FormArray;
  }
  loadWorksheet(): void {
    if (!this.worksheetId) {
      this.snackBar.open('Ungültige Worksheet-ID', 'OK', { duration: 3000 });
      this.router.navigate(['/student']);
      return;
    }

    this.isLoading = true;
    
    console.log('Lade Worksheet mit ID:', this.worksheetId);
    
    this.http.get<WorksheetForSubmission>(`${this.baseUrl}/worksheets/${this.worksheetId}`)
      .subscribe({
        next: (worksheet) => {
          console.log('Worksheet-Daten erhalten:', worksheet);
          
          if (!worksheet || !worksheet.tasks || worksheet.tasks.length === 0) {
            throw new Error('Ungültige Worksheet-Daten erhalten');
          }
          
          this.worksheet = worksheet;
          this.populateForm(worksheet);
          this.isLoading = false;
          
          console.log('Worksheet für Bearbeitung geladen:', worksheet.title);
          console.log('Anzahl Tasks:', worksheet.tasks.length);
          console.log('Kann bearbeitet werden:', worksheet.canEdit);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Laden des Worksheets:', err);
          console.error('Response Body:', err.error);
          
          this.isLoading = false;
          
          let errorMessage = 'Fehler beim Laden des Übungsblatts';
          
          if (err.status === 401) {
            errorMessage = 'Sie sind nicht angemeldet';
            this.router.navigate(['/auth/login']);
          } else if (err.status === 403) {
            errorMessage = 'Sie haben keine Berechtigung für dieses Übungsblatt';
          } else if (err.status === 404) {
            errorMessage = 'Übungsblatt nicht gefunden';
          } else if (err.status >= 500) {
            errorMessage = 'Serverfehler - Bitte versuchen Sie es später erneut';
          }
          
          this.snackBar.open(errorMessage, 'OK', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          
          this.router.navigate(['/student']);
        }
      });
  }

  private populateForm(worksheet: WorksheetForSubmission): void {
    // Antworten-Array leeren
    while (this.answersFormArray.length !== 0) {
      this.answersFormArray.removeAt(0);
    }    // Für jede Task ein Antwort-Control erstellen
    worksheet.tasks.forEach(task => {
      const answerForm = this.fb.group({
        taskId: [task.id],
        answer: [task.studentAnswer || '', []] // No required validation since only TEXT tasks remain
      });
      this.answersFormArray.push(answerForm);
    });

    // Form als unberührt markieren nach dem Befüllen
    this.worksheetForm.markAsUntouched();
  }  saveAnswers(silent: boolean = false): void {
    if (!this.worksheet || !this.worksheet.canEdit) {
      if (!silent) {
        this.snackBar.open('Dieses Übungsblatt kann nicht mehr bearbeitet werden', 'OK', { duration: 3000 });
      }
      return;
    }

    this.isSaving = true;
    
    // Filtere Antworten mit Inhalt und erstelle das richtige Format für das Backend
    const formAnswers = this.answersFormArray.value;
    const answers = formAnswers
      .map((answer: { answer: string }, index: number) => ({
        taskId: this.worksheet!.tasks[index].id,
        content: answer.answer ? answer.answer.trim() : ''
      }))
      .filter((answer: { taskId: number; content: string }) => answer.content.length > 0);
    
    const submissionData = {
      answers: answers
    };

    if (!silent) {
      console.log('Speichere Antworten:', submissionData);
    }

    this.http.post(`${this.baseUrl}/worksheets/${this.worksheetId}`, submissionData)
      .subscribe({
        next: (response) => {
          this.isSaving = false;
          this.lastSaved = new Date();
          this.worksheetForm.markAsUntouched();
          
          if (!silent) {
            this.snackBar.open('Antworten gespeichert', 'OK', { duration: 3000 });
          }
          
          console.log('Antworten erfolgreich gespeichert:', answers.length);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Speichern:', err);
          console.error('Response Body:', err.error);
          console.error('Gesendete Daten:', submissionData);
          
          this.isSaving = false;
          
          if (!silent) {
            let errorMessage = 'Fehler beim Speichern der Antworten';
            
            if (err.status === 401) {
              errorMessage = 'Sie sind nicht angemeldet';
              this.router.navigate(['/auth/login']);
            } else if (err.status === 403) {
              errorMessage = 'Dieses Übungsblatt kann nicht mehr bearbeitet werden';
            } else if (err.status === 400) {
              // Detaillierte Fehlermeldung aus dem Backend
              errorMessage = err.error?.message || 'Ungültige Eingabedaten';
            } else if (err.status >= 500) {
              errorMessage = 'Serverfehler - Bitte versuchen Sie es später erneut';
            }
            
            this.snackBar.open(errorMessage, 'OK', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        }
      });
  }

  submitWorksheet(): void {
    if (!this.worksheet || !this.worksheet.canEdit) {
      this.snackBar.open('Dieses Übungsblatt kann nicht abgegeben werden', 'OK', { duration: 3000 });
      return;
    }    // Since only TEXT tasks remain, no mandatory answers check needed
    // All TEXT tasks are optional

    // Bestätigungsdialog anzeigen
    const dialogRef = this.dialog.open(ConfirmSubmitDialogComponent, {
      width: '400px',
      data: {
        worksheetTitle: this.worksheet.title,
        taskCount: this.worksheet.tasks.length,
        answeredCount: this.answersFormArray.value.filter((answer: any) => answer.answer && answer.answer.trim().length > 0).length
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performSubmit();
      }
    });
  }
  private performSubmit(): void {
    if (!this.worksheet) {
      this.snackBar.open('Worksheet konnte nicht gefunden werden', 'OK', { duration: 3000 });
      return;
    }

    // Erst speichern, dann abgeben
    console.log('Speichere vor der Abgabe...');
    this.saveAnswers(true);
    
    // Warte bis Speichern abgeschlossen ist
    setTimeout(() => {
      this.isSubmitting = true;
      
      console.log('Gebe Worksheet ab:', this.worksheetId);
      
      this.http.put(`${this.baseUrl}/worksheets/${this.worksheetId}/submit`, {})
        .subscribe({
          next: (response) => {
            console.log('Erfolgreich abgegeben:', response);
            this.isSubmitting = false;
            this.snackBar.open('Übungsblatt erfolgreich abgegeben!', 'OK', { 
              duration: 5000,
              panelClass: ['success-snackbar']
            });
            // Zurück zum Dashboard
            this.router.navigate(['/student']);
          },
          error: (err: HttpErrorResponse) => {
            console.error('Fehler beim Abgeben:', err);
            console.error('Response Body:', err.error);
            console.error('Status:', err.status);
            
            this.isSubmitting = false;
            
            let errorMessage = 'Fehler beim Abgeben des Übungsblatts';
            
            if (err.status === 401) {
              errorMessage = 'Sie sind nicht angemeldet';
              this.router.navigate(['/auth/login']);
            } else if (err.status === 403) {
              errorMessage = 'Dieses Übungsblatt kann nicht mehr abgegeben werden';
            } else if (err.status === 400) {
              errorMessage = err.error?.message || 'Übungsblatt wurde bereits abgegeben';
            } else if (err.status === 404) {
              errorMessage = 'Übungsblatt oder Bearbeitung nicht gefunden';
            } else if (err.status >= 500) {
              errorMessage = 'Serverfehler - Bitte versuchen Sie es später erneut';
            }
            
            this.snackBar.open(errorMessage, 'OK', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
    }, 1500); // Etwas länger warten bis Speichern abgeschlossen ist
  }
  goBack(): void {
    if (this.worksheetForm.dirty) {
      const hasUnsavedChanges = confirm('Sie haben ungespeicherte Änderungen. Möchten Sie diese speichern?');
      if (hasUnsavedChanges) {
        this.saveAnswers();
        setTimeout(() => {
          this.router.navigate(['/student']);
        }, 1000);
        return;
      }
    }
    
    this.router.navigate(['/student']);
  }
  // Helper Methods
  getTaskIcon(taskType: string): string {
    return 'assignment'; // Only TEXT tasks remain
  }

  getTaskColor(taskType: string): string {
    return 'primary'; // Only TEXT tasks remain
  }

  getAnswerProgress(): { answered: number; total: number; percentage: number } {
    const total = this.worksheet?.tasks.length || 0;
    const answered = this.answersFormArray.value.filter((answer: any) => 
      answer.answer && answer.answer.trim().length > 0
    ).length;
    
    return {
      answered,
      total,
      percentage: total > 0 ? Math.round((answered / total) * 100) : 0
    };
  }

  formatLastSaved(): string {
    if (!this.lastSaved) return '';
    
    return this.lastSaved.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // SQL Executor Methods
  executeQuery(): void {
    if (!this.sqlForm.valid || !this.worksheet) {
      return;
    }

    const query = this.sqlForm.get('query')?.value?.trim();
    if (!query) {
      return;
    }

    this.isExecutingSql = true;
    this.sqlError = null;
    this.sqlResult = null;

    const queryRequest: QueryRequest = {
      query,
      database: this.worksheet.database
    };

    this.http.post<QueryResult>(`${this.sqlBaseUrl}/execute`, queryRequest)
      .subscribe({
        next: (result) => {
          this.isExecutingSql = false;
          this.sqlResult = result;
          this.snackBar.open(`Query executed successfully. ${result.rowCount} row(s) returned.`, 'OK', { 
            duration: 3000 
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isExecutingSql = false;
          console.error('SQL execution error:', err);
          this.sqlError = err.error?.message || 'Ein Fehler ist beim Ausführen der SQL-Abfrage aufgetreten';
          this.snackBar.open('Fehler beim Ausführen der SQL-Abfrage', 'OK', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  clearSqlQuery(): void {
    this.sqlForm.patchValue({ query: '' });
    this.sqlResult = null;
    this.sqlError = null;
  }

  clearSqlResults(): void {
    this.sqlResult = null;
    this.sqlError = null;
  }

  get sqlDisplayedColumns(): string[] {
    return this.sqlResult?.columns || [];
  }

  checkQueryMatchesTask() {
  if (!this.worksheet || !this.sqlForm.valid) return;
  this.isCheckingQuery = true;
  this.queryCheckResult = null;
  const body = {
    taskDescription: this.worksheet.tasks[0]?.description || '', // oder die passende Task-Beschreibung
    sqlQuery: this.sqlForm.get('query')?.value
  };
  console.log('Request-Body an Backend:', body); // <--- HIER HINZUFÜGEN
  this.http.post<{ matches: boolean, aiAnswer: string }>('http://localhost:3000/sql/check-query-matches-task', body)
  .subscribe({
    next: res => {
      this.queryCheckResult = res.matches;
      this.aiCheckResult = res; // <--- KI-Antwort speichern
      this.isCheckingQuery = false;
      this.snackBar.open(
        res.matches ? 'Die Query passt zur Aufgabe!' : 'Die Query passt nicht zur Aufgabe.',
        'OK',
        { duration: 3000 }
      );
    },
    error: err => {
      this.isCheckingQuery = false;
      this.snackBar.open('Fehler bei der Überprüfung der Query.', 'OK', { duration: 3000 });
    }
  });
}

  getOnlyReason(aiAnswer: string): string {
  return aiAnswer.replace(/^(JA|NEIN)[,:]?/i, '').trim();
}
}
