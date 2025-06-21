import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tutor-dashboard',
  standalone: true,
  imports: [MatIconModule, RouterModule, MatButtonModule, MatToolbar, MatSidenavModule, MatListModule],
  templateUrl: './tutor-dashboard.component.html',
  styleUrl: './tutor-dashboard.component.scss'
})
export class TutorDashboardComponent {

  constructor(private router: Router) { }

  goHome(): void {
        this.router.navigate(['/overview']);
    }

  goToDashboard() {
    this.router.navigate(['/tutor-dashboard']);
  }
}
