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
import { AuthService } from '../../auth/auth.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

interface SubmissionDetail {
  id: number;
  status: 'DRAFT' | 'SUBMITTED';
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
  taskId: number;
  task: Task;
}

@Component({
  selector: 'app-submission-detail',
  standalone: true,  imports: [
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
    ReactiveFormsModule,
  ],
  templateUrl: './submission-detail.component.html',
  styleUrl: './submission-detail.component.scss'
})
export class SubmissionDetailComponent implements OnInit {
  private baseUrl = 'http://localhost:3000/submissions';
  
  submission: SubmissionDetail | null = null;  submissionDetail: SubmissionDetail | null = null; // Alias für Template
  submissionId: number | null = null;
  isLoading = false;
  loading = false; // Alias für Template
  error: string | null = null;
  saving = false;

  // Text selection controls for task evaluations
  taskEvaluationControls: { [taskId: number]: FormControl } = {};

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
          for (const task of submission.worksheet.tasks) {
            const answer = this.getAnswerForTask(task.id);
            this.taskEvaluationControls[task.id] = new FormControl('');
          }
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
    // Placeholder für zukünftige Bewertungsfunktionalität
    this.saving = true;
    setTimeout(() => {
      this.saving = false;
      this.snackBar.open('Bewertung gespeichert', 'OK', { duration: 2000 });
    }, 1000);
  }
}
