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
import { MatToolbar } from '@angular/material/toolbar';

interface WorksheetOverview {
  id: number;
  title: string;
  description?: string;
  database: string;
  tutor: {
    id: number;
    name: string;
    email: string;
  };
  tasks: Array<{
    id: number;
    title: string;
    taskType: string;
    orderIndex: number;
  }>;
  _count: {
    tasks: number;
  };
  submission?: {
    id: number;
    status: 'DRAFT' | 'SUBMITTED';
    submittedAt?: string;
    updatedAt: string;
  };
  hasSubmission: boolean;
  isSubmitted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StudentSubmission {
  id: number;
  status: 'DRAFT' | 'SUBMITTED';
  submittedAt?: string;
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
    _count: {
      tasks: number;
    };
  };
  _count: {
    answers: number;
  };
}

@Component({
  selector: 'app-student-dashboard',
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
    MatToolbar
  ],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.scss'
})
export class StudentDashboardComponent implements OnInit {
  private baseUrl = 'http://localhost:3000/submissions';

  // State
  availableWorksheets: WorksheetOverview[] = [];
  mySubmissions: StudentSubmission[] = [];
  isLoadingWorksheets = false;
  isLoadingSubmissions = false;
  selectedTabIndex = 0;

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAvailableWorksheets();
    this.loadMySubmissions();
  }

  loadAvailableWorksheets(): void {
    this.isLoadingWorksheets = true;
    this.http.get<WorksheetOverview[]>(`${this.baseUrl}/worksheets/available`)
      .subscribe({
        next: (worksheets) => {
          this.availableWorksheets = worksheets;
          this.isLoadingWorksheets = false;
          console.log('Verfügbare Worksheets geladen:', worksheets.length);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Laden der verfügbaren Worksheets:', err);
          this.isLoadingWorksheets = false;
          
          let errorMessage = 'Fehler beim Laden der verfügbaren Übungsblätter';
          if (err.status === 401) {
            errorMessage = 'Sie sind nicht angemeldet';
            this.router.navigate(['/auth/login']);
          } else if (err.status === 403) {
            errorMessage = 'Sie haben keine Berechtigung, Übungsblätter anzuzeigen';
          }
          
          this.snackBar.open(errorMessage, 'OK', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  loadMySubmissions(): void {
    this.isLoadingSubmissions = true;
    this.http.get<StudentSubmission[]>(`${this.baseUrl}/my`)
      .subscribe({
        next: (submissions) => {
          this.mySubmissions = submissions;
          this.isLoadingSubmissions = false;
          console.log('Meine Submissions geladen:', submissions.length);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Laden der Submissions:', err);
          this.isLoadingSubmissions = false;
          
          let errorMessage = 'Fehler beim Laden Ihrer Abgaben';
          if (err.status === 401) {
            errorMessage = 'Sie sind nicht angemeldet';
            this.router.navigate(['/auth/login']);
          }
          
          this.snackBar.open(errorMessage, 'OK', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }
  startWorksheet(worksheet: WorksheetOverview): void {
    this.router.navigate(['/student/worksheet', worksheet.id]);
  }

  continueWorksheet(worksheet: WorksheetOverview): void {
    this.router.navigate(['/student/worksheet', worksheet.id]);
  }

  viewSubmission(submission: StudentSubmission): void {
    this.router.navigate(['/student/submission', submission.id]);
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    
    // Daten neu laden wenn Tab gewechselt wird
    if (index === 0) {
      this.loadAvailableWorksheets();
    } else if (index === 1) {
      this.loadMySubmissions();
    }
  }

  // Helper Methods
  getWorksheetStatusText(worksheet: WorksheetOverview): string {
    if (!worksheet.hasSubmission) {
      return 'Nicht begonnen';
    }
    
    if (worksheet.isSubmitted) {
      return 'Abgegeben';
    }
    
    return 'In Bearbeitung';
  }

  getWorksheetStatusIcon(worksheet: WorksheetOverview): string {
    if (!worksheet.hasSubmission) {
      return 'assignment';
    }
    
    if (worksheet.isSubmitted) {
      return 'check_circle';
    }
    
    return 'edit';
  }

  getWorksheetStatusColor(worksheet: WorksheetOverview): string {
    if (!worksheet.hasSubmission) {
      return 'primary';
    }
    
    if (worksheet.isSubmitted) {
      return 'accent';
    }
    
    return 'warn';
  }

  getSubmissionStatusText(submission: StudentSubmission): string {
    return submission.status === 'SUBMITTED' ? 'Abgegeben' : 'Entwurf';
  }

  getSubmissionStatusIcon(submission: StudentSubmission): string {
    return submission.status === 'SUBMITTED' ? 'check_circle' : 'edit';
  }

  getSubmissionStatusColor(submission: StudentSubmission): string {
    return submission.status === 'SUBMITTED' ? 'accent' : 'warn';
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

  goToOverview(): void {
    this.router.navigate(['/overview']);
  }

  get unsubmittedWorksheets(): WorksheetOverview[] {
  return this.availableWorksheets.filter(w => !w.isSubmitted);
  }
}
