import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../auth/auth.service';

interface StudentSubmissionDetail {
  id: number;
  status: 'DRAFT' | 'SUBMITTED';
  feedback?: string;
  passed?: boolean;
  submittedAt?: string;
  gradedAt?: string;
  createdAt: string;
  updatedAt: string;
  worksheet: {
    id: number;
    title: string;
    description?: string;
    database: string;
    tutor: {
      id: number;
      name: string;
      email: string;
    };
    tasks: StudentTask[];
  };
  answers: StudentAnswer[];
}

interface StudentTask {
  id: number;
  title: string;
  description: string;
  taskType: 'TEXT' | 'SQL' | 'MCQ';
  orderIndex: number;
  studentAnswer?: string;
  hasAnswer?: boolean;
  feedback?: string;
  isCorrect?: boolean;
}

interface StudentAnswer {
  id: number;
  content: string;
  feedback?: string;
  isCorrect?: boolean;
  taskId: number;
  task: StudentTask;
}

@Component({
  selector: 'app-student-submission-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './submission-detail.component.html',
  styleUrl: './submission-detail.component.scss'
})
export class StudentSubmissionDetailComponent implements OnInit {
  private baseUrl = 'http://localhost:3000/submissions';
  
  submission: StudentSubmissionDetail | null = null;
  submissionId: number | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.submissionId = +params['id'];
        this.loadSubmissionDetail();
      } else {
        this.error = 'Keine gültige Abgabe-ID gefunden';
      }
    });
  }

  private loadSubmissionDetail(): void {
    if (!this.submissionId) return;

    this.loading = true;
    this.error = null;
    
    this.http.get<StudentSubmissionDetail>(`${this.baseUrl}/${this.submissionId}/student`)
      .subscribe({
        next: (submission) => {
          this.submission = submission;
          this.loading = false;
          
          // Process tasks with answers and feedback
          this.processTasksWithFeedback();
          
          console.log('Student submission details loaded:', submission);
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          console.error('Error loading submission details:', err);
          
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
          this.snackBar.open(errorMessage, 'OK', { duration: 5000 });
        }
      });
  }

  private processTasksWithFeedback(): void {
    if (!this.submission) return;

    const answersMap = new Map();
    this.submission.answers.forEach(answer => {
      answersMap.set(answer.taskId, answer);
    });

    this.submission.worksheet.tasks = this.submission.worksheet.tasks.map(task => {
      const answer = answersMap.get(task.id);
      return {
        ...task,
        studentAnswer: answer?.content || '',
        hasAnswer: !!answer,
        feedback: answer?.feedback || null,
        isCorrect: answer?.isCorrect || null
      };
    });
  }

  getStatusColor(status: string): string {
    return status === 'SUBMITTED' ? 'accent' : 'warn';
  }

  getStatusText(status: string): string {
    return status === 'SUBMITTED' ? 'Abgegeben' : 'Entwurf';
  }

  getPassedStatusColor(): string {
    if (this.submission?.passed === true) return 'accent';
    if (this.submission?.passed === false) return 'warn';
    return 'primary';
  }

  getPassedStatusText(): string {
    if (this.submission?.passed === true) return 'Bestanden';
    if (this.submission?.passed === false) return 'Nicht bestanden';
    return 'Noch nicht bewertet';
  }

  getPassedStatusIcon(): string {
    if (this.submission?.passed === true) return 'check_circle';
    if (this.submission?.passed === false) return 'cancel';
    return 'help';
  }

  getTaskFeedbackIcon(task: StudentTask): string {
    if (task.isCorrect === true) return 'check_circle';
    if (task.isCorrect === false) return 'cancel';
    return 'help';
  }

  getTaskFeedbackColor(task: StudentTask): string {
    if (task.isCorrect === true) return 'accent';
    if (task.isCorrect === false) return 'warn';
    return 'primary';
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

  goBack(): void {
    this.router.navigate(['/student/dashboard']);
  }

  editSubmission(): void {
    if (this.submission && this.submission.status === 'DRAFT') {
      this.router.navigate(['/student/worksheet', this.submission.worksheet.id]);
    }
  }
}
