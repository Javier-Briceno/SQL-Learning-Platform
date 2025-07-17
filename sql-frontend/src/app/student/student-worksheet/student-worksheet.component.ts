import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators, FormsModule} from '@angular/forms';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmSubmitDialogComponent } from './confirm-submit-dialog.component';
import { MatSelectModule } from '@angular/material/select';
import { DatabaseContentDialogComponent } from '../../tutor-dashboard/datenbanken/database-content-dialog.component';
import { DatabaseSchemaDialogComponent } from '../../tutor-dashboard/datenbanken/database-schema-dialog.component';

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

interface ManipulationRequest {
  query: string;
  database: string;
  resetDatabase?: boolean;
}

interface ManipulationResult {
  success: boolean;
  message: string;
  affectedRows: number;
  executionTime: number;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP';
  resetPerformed: boolean;
  // Für SELECT-Queries: Daten zurückgeben
  columns?: string[];
  rows?: any[];
}

interface DatabaseCopyInfo {
  originalDatabase: string;
  copyDatabase: string;
  userId: number;
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string;
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
    MatTableModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatTooltipModule,
    MatSelectModule,
    FormsModule
  ],
  templateUrl: './student-worksheet.component.html',
  styleUrl: './student-worksheet.component.scss'
})
export class StudentWorksheetComponent implements OnInit {
  private baseUrl = 'http://localhost:3000/submissions';
  private sqlBaseUrl = 'http://localhost:3000/sql';

  worksheetForm!: FormGroup;
  manipulationForm!: FormGroup;
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
  isExecutingManipulation = false;
  manipulationResult: ManipulationResult | null = null;
  manipulationError: string | null = null;
  
  // Database Copy Info
  databaseCopyInfo: DatabaseCopyInfo | null = null;
  isLoadingCopyInfo = false;

  isCheckingQuery = false;
  queryCheckResult: boolean | null = null;
  aiCheckResult: CheckQueryResult | null = null;
  selectedTaskIndex: number = 0;

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

    this.manipulationForm = this.fb.group({
      query: ['', Validators.required],
      resetDatabase: [false]
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

  // SQL Executor Methods removed - now using Mixed Mode with executeManipulation()

  // This method is deprecated - use checkQueryMatchesTaskForMixedMode() instead
  checkQueryMatchesTask() {
    // Redirect to Mixed Mode implementation
    this.checkQueryMatchesTaskForMixedMode();
  }

  getOnlyReason(aiAnswer: string): string {
  return aiAnswer.replace(/^(JA|NEIN)[,:]?/i, '').trim();
}

  openDatabaseDialog() {
    this.dialog.open(DatabaseContentDialogComponent, {
      data: { dbName: this.worksheet?.database }
    });
  }

  showDatabaseContent() {
  if (!this.worksheet) return;
  const dbName = this.worksheet.database;
  this.http.get<any>(`http://localhost:3000/sql/inspect/${dbName}`).subscribe({
    next: (content) => {
      this.dialog.open(DatabaseContentDialogComponent, {
        data: {
          dbName,
          content
        },
        width: '800px'
      });
    },
    error: (err) => {
      this.snackBar.open('Fehler beim Laden der Datenbankstruktur', 'OK', { duration: 3000 });
    }
  });
}

  // Neue Methode für vereinfachte Schema-Ansicht
  showDatabaseSchema() {
    if (!this.worksheet) return;
    const dbName = this.worksheet.database;
    this.http.get<any>(`http://localhost:3000/sql/inspect-schema/${dbName}`).subscribe({
      next: (schema) => {
        this.dialog.open(DatabaseSchemaDialogComponent, {
          data: {
            dbName,
            schema
          },
          width: '900px',
          maxHeight: '80vh'
        });
      },
      error: (err) => {
        this.snackBar.open('Fehler beim Laden des Datenbankschemas', 'OK', { duration: 3000 });
      }
    });
  }

  // ===== NEUE METHODEN FÜR ERWEITERTE SQL-FUNKTIONALITÄT =====

  // Führt Manipulation Query aus
  executeManipulation(): void {
    if (!this.manipulationForm.valid || !this.worksheet) {
      return;
    }

    const query = this.manipulationForm.get('query')?.value?.trim();
    if (!query) {
      return;
    }

    this.isExecutingManipulation = true;
    this.manipulationError = null;
    this.manipulationResult = null;

    const manipulationRequest: ManipulationRequest = {
      query,
      database: this.worksheet.database,
      resetDatabase: this.manipulationForm.get('resetDatabase')?.value || false
    };

    this.http.post<ManipulationResult>(`${this.sqlBaseUrl}/execute-manipulation`, manipulationRequest)
      .subscribe({
        next: (result) => {
          this.isExecutingManipulation = false;
          this.manipulationResult = result;
          
          // Bei Success: Copy-Info aktualisieren
          this.loadDatabaseCopyInfo();
          
          this.snackBar.open(`${result.queryType}-Operation erfolgreich ausgeführt - ${result.affectedRows} betroffene Zeilen`, 'OK', { 
            duration: 3000 
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isExecutingManipulation = false;
          console.error('Manipulation execution error:', err);
          this.manipulationError = err.error?.message || 'Ein Fehler ist beim Ausführen der Manipulation aufgetreten';
          this.snackBar.open('Fehler beim Ausführen der Manipulation', 'OK', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  // Lädt Database Copy Info
  loadDatabaseCopyInfo(): void {
    if (!this.worksheet) return;
    
    this.isLoadingCopyInfo = true;
    this.http.get<DatabaseCopyInfo>(`${this.sqlBaseUrl}/database-copy-info/${this.worksheet.database}`)
      .subscribe({
        next: (info) => {
          this.databaseCopyInfo = info;
          this.isLoadingCopyInfo = false;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Laden der Copy-Info:', err);
          this.databaseCopyInfo = null;
          this.isLoadingCopyInfo = false;
        }
      });
  }

  // Setzt Database Copy zurück
  resetDatabaseCopy(): void {
    if (!this.worksheet) return;

    this.http.post(`${this.sqlBaseUrl}/reset-database-copy/${this.worksheet.database}`, {})
      .subscribe({
        next: () => {
          this.databaseCopyInfo = null;
          this.snackBar.open('Datenbank-Kopie wurde zurückgesetzt', 'OK', { duration: 3000 });
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Zurücksetzen der Copy:', err);
          this.snackBar.open('Fehler beim Zurücksetzen der Datenbank-Kopie', 'OK', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  // Löscht aktuellen Manipulation Query
  clearManipulationQuery(): void {
    this.manipulationForm.patchValue({ query: '' });
    this.manipulationResult = null;
    this.manipulationError = null;
  }

  // Setzt Beispiel-Query für Manipulation
  setExampleManipulationQuery(): void {
    this.manipulationForm.patchValue({
      query: 'SELECT * FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 5;'
    });
  }

  // Formatiert Datum für Anzeige
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('de-DE');
  }

  // Berechnet verbleibende Zeit bis Copy-Ablauf
  getRemainingTime(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Abgelaufen';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  // Getter für einfacheren Template-Zugriff
  get manipulationQueryControl() { return this.manipulationForm.get('query'); }
  get resetDatabaseControl() { return this.manipulationForm.get('resetDatabase'); }

  // ===== KI-CHECK FÜR MIXED MODE =====

  // KI-Check für Mixed Mode (verwendet manipulationForm)
  checkQueryMatchesTaskForMixedMode() {
    if (!this.worksheet || !this.manipulationForm.valid || this.worksheet.tasks.length === 0) {
      this.snackBar.open('Bitte wählen Sie eine gültige Query aus', 'OK', { duration: 3000 });
      return;
    }

    const selectedTask = this.worksheet.tasks[this.selectedTaskIndex];
    const query = this.manipulationForm.get('query')?.value?.trim();

    if (!selectedTask || !query) {
      this.snackBar.open('Keine Aufgabe oder Query ausgewählt', 'OK', { duration: 3000 });
      return;
    }

    this.isCheckingQuery = true;
    this.aiCheckResult = null;

    const checkData = {
      taskDescription: selectedTask.description,
      sqlQuery: query,
      dbName: this.worksheet.database
    };

    this.http.post<{ matches: boolean, aiAnswer: string }>(`${this.sqlBaseUrl}/check-query-matches-task`, checkData)
      .subscribe({
        next: (result) => {
          this.isCheckingQuery = false;
          this.aiCheckResult = result;
          
          const message = result.matches 
            ? 'Die KI bewertet Ihre Query als korrekt!' 
            : 'Die KI hat Verbesserungsvorschläge für Ihre Query.';
          
          this.snackBar.open(message, 'OK', { 
            duration: 5000,
            panelClass: result.matches ? ['success-snackbar'] : ['warning-snackbar']
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isCheckingQuery = false;
          console.error('KI-Check error:', err);
          this.snackBar.open('Fehler beim KI-Check der Query', 'OK', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }
}
