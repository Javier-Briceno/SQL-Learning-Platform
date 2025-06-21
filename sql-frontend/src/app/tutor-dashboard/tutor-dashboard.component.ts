import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCard } from '@angular/material/card';
import { MatCardTitle } from '@angular/material/card';
import { MatCardContent } from '@angular/material/card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tutor-dashboard',
  standalone: true,
  imports: [MatIconModule, RouterModule, MatButtonModule, MatToolbar, MatSidenavModule, MatListModule, MatCard, MatCardTitle, MatCardContent, CommonModule],
  templateUrl: './tutor-dashboard.component.html',
  styleUrl: './tutor-dashboard.component.scss'
})
export class TutorDashboardComponent {

  onlineStudentsCount: number | null = null;
  todaysSubmissionsCount: number | null = null;

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit(): void {
    this.loadOnlineStudents();
    this.loadTodaysSubmissions();
  }

  goHome(): void {
        this.router.navigate(['/overview']);
    }

  goToDashboard() {
    this.router.navigate(['/tutor-dashboard']);
  }

  loadOnlineStudents(): void {
  this.http.get<{ online: number }>('http://localhost:3000/auth/students/online').subscribe({
    next: (res) => this.onlineStudentsCount = res.online,
    error: () => this.onlineStudentsCount = null
  });
  }

  loadTodaysSubmissions(): void {
  this.http.get<{ count: number }>('http://localhost:3000/auth/submissions/today').subscribe({
    next: (res) => this.todaysSubmissionsCount = res.count,
    error: () => this.todaysSubmissionsCount = null
  });
}

  isRootRoute(): boolean {
    return this.router.url === '/tutor-dashboard';
  }
}
