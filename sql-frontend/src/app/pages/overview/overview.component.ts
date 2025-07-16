import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { Observable, of } from 'rxjs';
import { MatToolbar } from '@angular/material/toolbar';
import { MatProgressBar } from '@angular/material/progress-bar';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardTitle, MatCardContent, MatCardActions, MatCardHeader, MatCardSubtitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbar, MatProgressBar, MatCard, MatIcon, MatCardTitle, MatCardContent, MatCardActions, MatCardHeader, MatCardSubtitle, FormsModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent implements OnInit {
  isAdmin$: Observable<boolean> = of(false);
  isTutor$: Observable<boolean> = of(false);
  isStudent$: Observable<boolean> = of(false);
  worksheets: any[] = [];
  searchTerm: string = '';

  progressPercent = 0;
  totalWorksheets = 0;
  submittedWorksheets = 0;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {
    this.isAdmin$ = this.authService.isAdmin();
    this.isTutor$ = this.authService.isTutor();
    this.isStudent$ = this.authService.isStudent();
  }

  ngOnInit() {
  this.isStudent$.subscribe(isStudent => {
    if (isStudent) {
      // Alle Worksheets laden
      this.http.get<any[]>('http://localhost:3000/worksheets/public/all').subscribe({
        next: (worksheets) => {
          // Eigene Submissions laden
          this.http.get<any[]>('http://localhost:3000/submissions/my').subscribe({
            next: (submissions) => {
              // IDs der abgegebenen Worksheets
              const submittedWorksheetIds = submissions
                .filter(s => s.status === 'SUBMITTED')
                .map(s => s.worksheetId);

              // Nur Worksheets anzeigen, zu denen keine SUBMITTED-Submission existiert
              this.worksheets = worksheets.filter(ws => !submittedWorksheetIds.includes(ws.id));

              this.totalWorksheets = worksheets.length;
              this.submittedWorksheets = submittedWorksheetIds.length;
              this.progressPercent = this.totalWorksheets > 0
                ? Math.round((this.submittedWorksheets / this.totalWorksheets) * 100)
                : 0;
            }
          });
        }
      });
    }
  });
}

get filteredWorksheets() {
  if (!this.searchTerm) return this.worksheets;
  const term = this.searchTerm.toLowerCase();
  return this.worksheets.filter(w => w.title?.toLowerCase().includes(term));
}
}