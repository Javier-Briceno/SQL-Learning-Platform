import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { SqlQueryExecutorComponent } from '../sql-query-executor/sql-query-executor.component';

enum TaskType {
  TEXT = 'TEXT'
}

interface Task {
  id?: number;
  title: string;
  description: string;
  taskType: 'TEXT';
  solution?: string;
  orderIndex: number;
}

interface Worksheet {
  id?: number;
  title: string;
  description?: string;
  database: string;
  tasks: Task[];
}

interface WorksheetWithTasks extends Worksheet {
  id: number;
  tutorId: number;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-worksheet-creator',
  standalone: true,  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTabsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatExpansionModule,
    MatChipsModule,
    SqlQueryExecutorComponent
  ],
  templateUrl: './worksheet-creator.component.html',
  styleUrl: './worksheet-creator.component.scss'
})
export class WorksheetCreatorComponent implements OnInit {
  @ViewChild(SqlQueryExecutorComponent) sqlExecutor!: SqlQueryExecutorComponent;

  private baseUrl = 'http://localhost:3000/worksheets';
  
  worksheetForm!: FormGroup;
  databases: string[] = [];  // State Management
  isLoading = false;
  isSaving = false;
  isEditing = false;
  isPreviewMode = false;
  worksheetId: number | null = null;
  
  // UI State
  selectedTabIndex = 0;
  errorMessage = '';
  isLoadingDatabases = false;
  isLoadingWorksheet = false;
  
  // Enums für Template
  TaskType = TaskType;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
  }
  ngOnInit(): void {
    this.loadDatabases();
    
    // Prüfe, ob wir ein existierendes Worksheet bearbeiten oder vorschauen
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.worksheetId = +params['id'];
        
        // Prüfe die URL um zwischen Edit und Preview zu unterscheiden
        const url = this.router.url;
        if (url.includes('/preview/')) {
          this.isPreviewMode = true;
          this.isEditing = false;
        } else if (url.includes('/edit/')) {
          this.isEditing = true;
          this.isPreviewMode = false;
        }
        
        this.loadWorksheet(this.worksheetId);
      }
    });
    
    // Wenn Preview-Modus, deaktiviere das Formular
    if (this.isPreviewMode) {
      this.worksheetForm.disable();
    }
  }

  // Initialisiere das Reactive Form
  private initializeForm(): void {
    this.worksheetForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      database: ['', [Validators.required]],
      tasks: this.fb.array([])
    });
  }

  // Getter für FormArray
  get tasksFormArray(): FormArray {
    return this.worksheetForm.get('tasks') as FormArray;
  }
  // Lade verfügbare Datenbanken
  loadDatabases(): void {
    this.isLoadingDatabases = true;
    this.http.get<string[]>(`${this.baseUrl}/databases/available`)
      .subscribe({
        next: (databases) => {
          this.databases = databases;
          this.isLoadingDatabases = false;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Laden der Datenbanken:', err);
          this.snackBar.open('Fehler beim Laden der Datenbanken', 'OK', { duration: 3000 });
          this.isLoadingDatabases = false;
        }
      });
  }
  // Lade existierendes Worksheet
  loadWorksheet(id: number): void {
    this.isLoading = true;
    this.isLoadingWorksheet = true;
    this.http.get<Worksheet>(`${this.baseUrl}/${id}`)
      .subscribe({
        next: (worksheet) => {
          this.populateForm(worksheet);
          this.isLoading = false;
          this.isLoadingWorksheet = false;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Laden des Übungsblatts:', err);
          this.snackBar.open('Fehler beim Laden des Übungsblatts', 'OK', { duration: 3000 });
          this.isLoading = false;
          this.isLoadingWorksheet = false;
          this.router.navigate(['/tutor-dashboard/worksheets']);
        }
      });
  }

  // Befülle Form mit existierenden Daten
  private populateForm(worksheet: Worksheet): void {
    this.worksheetForm.patchValue({
      title: worksheet.title,
      description: worksheet.description,
      database: worksheet.database
    });

    // Tasks hinzufügen
    worksheet.tasks.forEach(task => {
      this.addTask(task);
    });
  }

  // Neue Aufgabe hinzufügen
  addTask(existingTask?: Task): void {
    const taskForm = this.fb.group({
      id: [existingTask?.id || null],
      title: [existingTask?.title || '', [Validators.required]],
      description: [existingTask?.description || '', [Validators.required]],
      taskType: [existingTask?.taskType || TaskType.TEXT, [Validators.required]],
      solution: [existingTask?.solution || ''],
      orderIndex: [existingTask?.orderIndex ?? this.tasksFormArray.length],
      _action: [existingTask ? 'update' : 'create']
    });

    this.tasksFormArray.push(taskForm);
  }

  // Aufgabe entfernen
  removeTask(index: number): void {
    const task = this.tasksFormArray.at(index);
    
    // Wenn Task eine ID hat, markiere als zu löschen
    if (task.get('id')?.value) {
      task.get('_action')?.setValue('delete');
      // Verstecke die Task visuell, aber behalte sie für die API
      task.disable();
    } else {
      // Neue Task kann direkt entfernt werden
      this.tasksFormArray.removeAt(index);
    }

    // Update orderIndex der verbleibenden Tasks
    this.updateTaskOrderIndices();
  }

  // Task nach oben verschieben
  moveTaskUp(index: number): void {
    if (index > 0) {
      const task = this.tasksFormArray.at(index);
      this.tasksFormArray.removeAt(index);
      this.tasksFormArray.insert(index - 1, task);
      this.updateTaskOrderIndices();
    }
  }

  // Task nach unten verschieben
  moveTaskDown(index: number): void {
    if (index < this.tasksFormArray.length - 1) {
      const task = this.tasksFormArray.at(index);
      this.tasksFormArray.removeAt(index);
      this.tasksFormArray.insert(index + 1, task);
      this.updateTaskOrderIndices();
    }
  }

  // Aktualisiere orderIndex aller Tasks
  private updateTaskOrderIndices(): void {
    this.tasksFormArray.controls.forEach((task, index) => {
      if (task.enabled) {
        task.get('orderIndex')?.setValue(index);
      }
    });
  }

  // Worksheet speichern
  saveWorksheet(): void {
    if (this.worksheetForm.invalid) {
      this.markFormGroupTouched();
      this.snackBar.open('Bitte füllen Sie alle Pflichtfelder aus', 'OK', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    const formValue = this.worksheetForm.value;
    
    // Bereite Tasks für API vor
    const tasks = formValue.tasks
      .filter((task: any) => task._action !== 'delete' || task.id) // Behalte delete-markierte mit ID
      .map((task: any, index: number) => ({
        ...task,
        orderIndex: task._action === 'delete' ? task.orderIndex : index
      }));

    const worksheetData = {
      title: formValue.title,
      description: formValue.description,
      database: formValue.database,
      tasks: tasks
    };

    const request = this.isEditing 
      ? this.http.put<Worksheet>(`${this.baseUrl}/${this.worksheetId}`, worksheetData)
      : this.http.post<Worksheet>(`${this.baseUrl}`, worksheetData);    request.subscribe({
      next: (worksheet) => {
        this.isSaving = false;
        const message = this.isEditing ? 'Übungsblatt erfolgreich aktualisiert' : 'Übungsblatt erfolgreich erstellt';
        this.snackBar.open(message, 'OK', { duration: 3000 });
        
        if (!this.isEditing) {
          // Nach dem Erstellen zur Bearbeitung wechseln
          this.router.navigate(['/tutor-dashboard/worksheets/edit', worksheet.id]);
        } else {
          // Formular mit neuen Daten aktualisieren
          this.populateFormAfterSave(worksheet);
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Fehler beim Speichern:', err);
        this.isSaving = false;
        
        let errorMessage = 'Unbekannter Fehler beim Speichern des Übungsblatts';
        
        // Detaillierte Fehlerbehandlung basierend auf Status Code
        if (err.status === 400) {
          // Bad Request - Validierungsfehler
          errorMessage = err.error?.message || 'Ungültige Eingabedaten. Bitte überprüfen Sie alle Felder.';
        } else if (err.status === 401) {
          // Unauthorized - Token Probleme
          errorMessage = 'Sie sind nicht angemeldet. Bitte loggen Sie sich erneut ein.';
          this.router.navigate(['/auth/login']);
        } else if (err.status === 403) {
          // Forbidden - Keine Berechtigung
          errorMessage = 'Sie haben keine Berechtigung für diese Aktion. Nur Tutoren können Übungsblätter erstellen.';
        } else if (err.status === 404) {
          // Not Found
          errorMessage = 'Ressource nicht gefunden. Das Übungsblatt existiert möglicherweise nicht mehr.';
        } else if (err.status === 500) {
          // Internal Server Error
          errorMessage = 'Serverfehler. Bitte prüfen Sie: 1) Datenbankverbindung, 2) Alle Felder ausgefüllt, 3) Datenbank ausgewählt';
        } else if (err.status === 0) {
          // Network Error
          errorMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung und ob der Server läuft.';
        }
        
        // Zusätzliche Details wenn verfügbar
        if (err.error?.details) {
          errorMessage += `\n\nDetails: ${err.error.details}`;
        }
        
        console.error('Detaillierter Fehler:', {
          status: err.status,
          message: err.error?.message,
          details: err.error,
          url: err.url
        });
        
        this.snackBar.open(errorMessage, 'OK', { 
          duration: 8000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  // Form nach dem Speichern aktualisieren
  private populateFormAfterSave(worksheet: Worksheet): void {
    // Tasks Array leeren und neu befüllen
    while (this.tasksFormArray.length !== 0) {
      this.tasksFormArray.removeAt(0);
    }
    
    this.populateForm(worksheet);
  }

  // Zur Übersicht zurückkehren
  goBack(): void {
    this.router.navigate(['/tutor-dashboard/worksheets']);
  }

  // Zur Vorschau wechseln
  goToPreview(): void {
    if (this.worksheetId) {
      this.router.navigate(['/tutor-dashboard/worksheets/preview', this.worksheetId]);
    }
  }

  // Tab-Wechsel
  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    
    // Wenn zur SQL-Executor-Tab gewechselt wird und Datenbank ausgewählt ist
    if (index === 1 && this.worksheetForm.get('database')?.value) {
      setTimeout(() => {
        if (this.sqlExecutor) {
          this.sqlExecutor.queryForm.patchValue({
            database: this.worksheetForm.get('database')?.value
          });
        }
      }, 100);
    }
  }

  // Datenbank-Auswahl ändern
  onDatabaseChange(): void {
    // Aktualisiere SQL Executor mit neuer Datenbank
    if (this.sqlExecutor && this.worksheetForm.get('database')?.value) {
      this.sqlExecutor.queryForm.patchValue({
        database: this.worksheetForm.get('database')?.value
      });
    }
  }

  // Form als touched markieren
  private markFormGroupTouched(): void {
    Object.keys(this.worksheetForm.controls).forEach(key => {
      this.worksheetForm.get(key)?.markAsTouched();
    });

    this.tasksFormArray.controls.forEach(task => {
      Object.keys(task.value).forEach(key => {
        task.get(key)?.markAsTouched();
      });
    });
  }
  // Getter für einfacheren Template-Zugriff
  get titleControl() { return this.worksheetForm.get('title'); }
  get databaseControl() { return this.worksheetForm.get('database'); }
  get tasksArray() { return this.tasksFormArray; }
  get isEditMode() { return this.isEditing; }
  goToOverview(): void {
    this.router.navigate(['/tutor-dashboard/worksheets']);
  }

  createNew(): void {
    this.router.navigate(['/tutor-dashboard/worksheets/new']);
  }

  // Wechsle vom Preview-Modus zum Edit-Modus
  editWorksheet(): void {
    if (this.worksheetId) {
      this.router.navigate(['/tutor-dashboard/worksheets/edit', this.worksheetId]);
    }
  }
}
