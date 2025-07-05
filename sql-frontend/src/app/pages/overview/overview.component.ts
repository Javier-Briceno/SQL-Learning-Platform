import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { Observable, of } from 'rxjs';
import { MatToolbar } from '@angular/material/toolbar';
import { MatProgressBar } from '@angular/material/progress-bar';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbar, MatProgressBar, MatCard, MatIcon],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent implements OnInit {
  isAdmin$: Observable<boolean> = of(false);
  isTutor$: Observable<boolean> = of(false);
  isStudent$: Observable<boolean> = of(false);

  progressPercent = 0;
  totalWorksheets = 0;
  submittedWorksheets = 0;

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {
    this.isAdmin$ = this.authService.isAdmin();
    this.isTutor$ = this.authService.isTutor();
    this.isStudent$ = this.authService.isStudent();
  }

  ngOnInit() {
    // Nur für Studenten laden
    this.isStudent$.subscribe(isStudent => {
      if (isStudent) {
        // Alle verfügbaren Worksheets laden
        this.http.get<any[]>('http://localhost:3000/worksheets/public/all').subscribe({
          next: (worksheets) => {
            this.totalWorksheets = worksheets.length;
            // Abgaben des eingeloggten Studenten laden
            this.http.get<any[]>('http://localhost:3000/submissions/my').subscribe({
              next: (submissions) => {
                // Nur SUBMITTED zählen
                this.submittedWorksheets = submissions.filter(s => s.status === 'SUBMITTED').length;
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
}