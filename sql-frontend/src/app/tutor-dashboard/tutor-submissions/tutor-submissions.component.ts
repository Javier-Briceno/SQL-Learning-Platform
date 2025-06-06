import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';

interface TutorSubmission {
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
    _count: {
      tasks: number;
    };
  };
  _count: {
    answers: number;
  };
}

@Component({
  selector: 'app-tutor-submissions',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatBadgeModule,
    MatTableModule,
    MatSortModule
  ],
  templateUrl: './tutor-submissions.component.html',
  styleUrl: './tutor-submissions.component.scss'
})
export class TutorSubmissionsComponent implements OnInit {
  private baseUrl = 'http://localhost:3000/submissions';

  submissions: TutorSubmission[] = [];
  isLoading = false;
  selectedTabIndex = 0;

  displayedColumns: string[] = ['student', 'worksheet', 'status', 'progress', 'date', 'actions'];

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSubmissions();
  }

  loadSubmissions(): void {
    this.isLoading = true;
    this.http.get<TutorSubmission[]>(`${this.baseUrl}/tutor/my`)
      .subscribe({
        next: (submissions) => {
          this.submissions = submissions;
          this.isLoading = false;
          console.log('Tutor Submissions geladen:', submissions.length);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Laden der Submissions:', err);
          this.isLoading = false;
          
          let errorMessage = 'Fehler beim Laden der Abgaben';
          if (err.status === 401) {
            errorMessage = 'Sie sind nicht angemeldet';
            this.router.navigate(['/auth/login']);
          } else if (err.status === 403) {
            errorMessage = 'Sie haben keine Berechtigung, Abgaben anzuzeigen';
          }
          
          this.snackBar.open(errorMessage, 'OK', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }
  viewSubmission(submission: TutorSubmission): void {
    console.log('viewSubmission aufgerufen mit:', submission);
    console.log('Navigiere zu:', '/tutor-dashboard/submissions', submission.id);
    this.router.navigate(['/tutor-dashboard/submissions', submission.id]);
  }

  goToWorksheets(): void {
    this.router.navigate(['/tutor-dashboard/worksheets']);
  }

  // Filter Methods
  get submittedSubmissions(): TutorSubmission[] {
    return this.submissions.filter(s => s.status === 'SUBMITTED');
  }

  get draftSubmissions(): TutorSubmission[] {
    return this.submissions.filter(s => s.status === 'DRAFT');
  }

  get allSubmissions(): TutorSubmission[] {
    return this.submissions;
  }

  // Helper Methods
  getSubmissionStatusText(submission: TutorSubmission): string {
    return submission.status === 'SUBMITTED' ? 'Abgegeben' : 'In Bearbeitung';
  }

  getSubmissionStatusIcon(submission: TutorSubmission): string {
    return submission.status === 'SUBMITTED' ? 'check_circle' : 'edit';
  }

  getSubmissionStatusColor(submission: TutorSubmission): string {
    return submission.status === 'SUBMITTED' ? 'accent' : 'warn';
  }

  getProgressPercentage(submission: TutorSubmission): number {
    const total = submission.worksheet._count.tasks;
    const answered = submission._count.answers;
    return total > 0 ? Math.round((answered / total) * 100) : 0;
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 100) return 'accent';
    if (percentage >= 50) return 'primary';
    return 'warn';
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

  // Statistics
  getSubmissionStats() {
    const total = this.submissions.length;
    const submitted = this.submittedSubmissions.length;
    const drafts = this.draftSubmissions.length;
    
    return {
      total,
      submitted,
      drafts,
      submissionRate: total > 0 ? Math.round((submitted / total) * 100) : 0
    };
  }  onTabChange(index: number): void {
    this.selectedTabIndex = index;
  }
}
