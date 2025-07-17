import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from '../../auth/auth.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

interface SubmissionDetail {
  id: number;
  status: 'DRAFT' | 'SUBMITTED';
  feedback?: string;
  passed?: boolean;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  student: {
    id: number;
    name: string;
    email: string;
  };
  worksheet: {
    id: number;
    title: string;
    description?: string;
    database: string;
    tasks: Task[];
  };
  answers: Answer[];
}

interface Task {
  id: number;
  title: string;
  description: string;
  taskType: 'TEXT';
  orderIndex: number;
}

interface Answer {
  id: number;
  content: string;
  feedback?: string;
  isCorrect?: boolean;
  taskId: number;
  task: Task;
}

@Component({
  selector: 'app-submission-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  templateUrl: './submission-detail.component.html',
  styleUrl: './submission-detail.component.scss'
})
export class SubmissionDetailComponent implements OnInit {
  private baseUrl = 'http://localhost:3000/submissions';
  
  submission: SubmissionDetail | null = null;
  submissionDetail: SubmissionDetail | null = null; // Alias für Template
  submissionId: number | null = null;
  isLoading = false;
  loading = false; // Alias für Template
  error: string | null = null;
  saving = false;

  // Form controls for task evaluations and passed status
  taskEvaluationControls: { [taskId: number]: FormControl } = {};
  taskPassedControls: { [taskId: number]: FormControl } = {};
  passedControl = new FormControl(false);
  overallFeedbackControl = new FormControl('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}  ngOnInit(): void {
    console.log('SubmissionDetailComponent ngOnInit aufgerufen');
    
    // Debug authentication status
    console.log('Token exists:', this.authService.isLoggedIn());
    console.log('Token value:', this.authService.getToken());
    
    // Check user profile and role
    this.authService.getProfile().subscribe({
      next: (user) => {
        console.log('Current user profile:', user);
        console.log('User role:', user.role);
        console.log('Is tutor:', user.role === 'TUTOR');
      },
      error: (error) => {
        console.error('Error getting user profile:', error);
      }
    });
    
    this.route.params.subscribe(params => {
      console.log('Route params:', params);
      if (params['id']) {
        this.submissionId = +params['id'];
        console.log('SubmissionId aus Route:', this.submissionId);
        this.loadSubmissionDetail();
      } else {
        console.error('Keine ID in Route gefunden');
      }
    });
  }private loadSubmissionDetail(): void {
    if (!this.submissionId) return;

    console.log('Lade Submission Details für ID:', this.submissionId);
    const url = `${this.baseUrl}/${this.submissionId}`;
    console.log('HTTP GET Request URL:', url);

    this.isLoading = true;
    this.loading = true;
    this.error = null;
    
    this.http.get<SubmissionDetail>(url)
      .subscribe({
        next: (submission) => {
          console.log('Submission Details erfolgreich geladen:', submission);
          this.submission = submission;
          this.submissionDetail = submission; // Für Template
          this.isLoading = false;
          this.loading = false;

          // Initialisiere die FormControls für die Aufgabenbewertungen
          this.taskEvaluationControls = {};
          this.taskPassedControls = {};
          for (const task of submission.worksheet.tasks) {
            const answer = this.getAnswerForTask(task.id);
            this.taskEvaluationControls[task.id] = new FormControl(answer?.feedback || '');
            this.taskPassedControls[task.id] = new FormControl(answer?.isCorrect || false);
          }
          
          // Initialize overall feedback and passed status
          this.overallFeedbackControl.setValue(submission.feedback || '');
          this.passedControl.setValue(submission.passed || false);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Laden der Submission:', err);
          console.error('Status:', err.status);
          console.error('Error Message:', err.message);
          console.error('URL war:', url);
          this.isLoading = false;
          this.loading = false;
          
          let errorMessage = 'Fehler beim Laden der Abgabe';
          if (err.status === 401) {
            errorMessage = 'Sie sind nicht angemeldet';
            this.router.navigate(['/auth/login']);
          } else if (err.status === 403) {
            errorMessage = 'Sie haben keine Berechtigung für diese Abgabe';
          } else if (err.status === 404) {
            errorMessage = 'Abgabe nicht gefunden';
          }
          
          this.error = errorMessage;
          this.snackBar.open(errorMessage, 'OK', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          
          // Nicht automatisch zurück navigieren für Debug-Zwecke
          // this.router.navigate(['/tutor-dashboard/submissions']);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/tutor-dashboard/submissions']);
  }
  getStatusColor(status?: string): string {
    if (!status && !this.submission) return 'primary';
    const submissionStatus = status || this.submission?.status;
    return submissionStatus === 'SUBMITTED' ? 'accent' : 'warn';
  }

  getStatusIcon(status?: string): string {
    if (!status && !this.submission) return 'assignment';
    const submissionStatus = status || this.submission?.status;
    return submissionStatus === 'SUBMITTED' ? 'check_circle' : 'edit';
  }

  getStatusText(status?: string): string {
    if (!status && !this.submission) return 'Unbekannt';
    const submissionStatus = status || this.submission?.status;
    return submissionStatus === 'SUBMITTED' ? 'Abgegeben' : 'In Bearbeitung';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getAnswerForTask(taskId: number): Answer | undefined {
    return this.submission?.answers.find(answer => answer.taskId === taskId);
  }
  getProgressPercentage(): number {
    if (!this.submission) return 0;
    const totalTasks = this.submission.worksheet.tasks.length;
    const answeredTasks = this.submission.answers.length;
    return totalTasks > 0 ? Math.round((answeredTasks / totalTasks) * 100) : 0;
  }

  saveEvaluation(): void {
    if (!this.submissionId || !this.submission) return;

    this.saving = true;
    
    // Prepare feedback data
    const feedbackData = {
      feedback: this.overallFeedbackControl.value,
      passed: this.passedControl.value,
      answers: [] as Array<{
        id: number;
        feedback?: string;
        isCorrect?: boolean;
      }>
    };

    // Collect individual task feedback
    for (const [taskIdStr, control] of Object.entries(this.taskEvaluationControls)) {
      const taskId = parseInt(taskIdStr);
      const feedback = control.value;
      const isCorrect = this.taskPassedControls[taskId]?.value;
      
      // Find the answer for this task
      const answer = this.submissionDetail?.answers.find(a => a.taskId === taskId);
      if (answer) {
        feedbackData.answers.push({
          id: answer.id,
          feedback: feedback || undefined,
          isCorrect: isCorrect
        });
      }
    }

    // Send to backend
    this.http.put(`${this.baseUrl}/${this.submissionId}/feedback`, feedbackData)
      .subscribe({
        next: (response) => {
          this.saving = false;
          this.snackBar.open('Bewertung erfolgreich gespeichert', 'OK', { duration: 3000 });
          
          // Update local data
          if (this.submission) {
            this.submission.feedback = feedbackData.feedback || undefined;
            this.submission.passed = feedbackData.passed || undefined;
            this.submissionDetail = this.submission;
          }
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          console.error('Fehler beim Speichern der Bewertung:', err);
          this.snackBar.open('Fehler beim Speichern der Bewertung', 'OK', { duration: 5000 });
        }
      });
  }

  async bewerteAufgabeMitKI(task: Task): Promise<void> {
    if (!this.submissionDetail) return;

    this.saving = true;

    const aufgabe = this.stripHtml(task.description);
    const antwort = this.getAnswerForTask(task.id)?.content ?? '';
    const dbName = this.submissionDetail.worksheet.database;

    try {
      const result = await this.http.post<{ feedback: string; korrekt: boolean }>(
        'http://localhost:3000/sql/evaluate-answer',
        { aufgabe, antwort, dbName }
      ).toPromise();

      if (result) {
        this.taskEvaluationControls[task.id].setValue(result.feedback);
        this.taskPassedControls[task.id].setValue(result.korrekt);
      } else {
        throw new Error('Leere Antwort von der KI');
      }

      this.snackBar.open(`Aufgabe ${task.title} bewertet`, 'OK', { duration: 2000 });
    } catch (error) {
      console.error(`Fehler bei Aufgabe ${task.id}:`, error);
      this.taskEvaluationControls[task.id].setValue('⚠️ Fehler bei der KI-Auswertung.');
      this.taskPassedControls[task.id].setValue(false);
    } finally {
      this.saving = false;
    }
  }

  antwortPruefen(aufgabe: string, antwort: string): boolean {
    // Simple heuristische Prüfung (z.B. SQL-Keywords)
    const expectedKeywords = ['select', 'from', 'join', 'where'];

    const normalizedAnswer = antwort.toLowerCase();
    return expectedKeywords.some(keyword => normalizedAnswer.includes(keyword));
  }

  stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  async bewerteGesamtbewertungMitKI(): Promise<void> {
    if (!this.submissionDetail) return;

    const aufgabenData = this.submissionDetail.worksheet.tasks.map(task => {
      const aufgabe = this.stripHtml(task.description);
      const antwort = this.getAnswerForTask(task.id)?.content ?? '';
      const feedback = this.taskEvaluationControls[task.id].value ?? '';
      const bestanden = this.taskPassedControls[task.id].value ?? false;

      return { aufgabe, antwort, feedback, bestanden };
    });

    const alleBewertet = aufgabenData.every(entry => entry.feedback.trim().length > 0);
    if (!alleBewertet) {
      this.snackBar.open('Bitte bewerte zuerst alle Aufgaben mit KI.', 'OK', { duration: 3000 });
      return;
    }

    this.saving = true;

    try {
      const result = await this.http.post<{ feedback: string }>(
        'http://localhost:3000/sql/evaluate-submission',
        { aufgaben: aufgabenData }
      ).toPromise();

      const fullFeedback = result?.feedback ?? '';
      const passed = fullFeedback.toUpperCase().includes('BESTANDEN') &&
                    !fullFeedback.toUpperCase().includes('NICHT BESTANDEN');

      this.overallFeedbackControl.setValue(fullFeedback);
      this.passedControl.setValue(passed);

      this.snackBar.open('Gesamtfeedback erfolgreich generiert.', 'OK', { duration: 3000 });
    } catch (error) {
      console.error('Fehler bei KI-Auswertung der Gesamtbewertung:', error);
      this.overallFeedbackControl.setValue('⚠️ Fehler bei der KI-Auswertung.');
      this.passedControl.setValue(false);
    } finally {
      this.saving = false;
    }
  }

  alleAufgabenBewertet(): boolean {
    return this.submissionDetail?.worksheet.tasks.every(task => {
      const value = this.taskEvaluationControls[task.id]?.value;
      return value && value.trim().length > 0;
    }) ?? false;
  }

}
