import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent {
  isAdmin$: Observable<boolean> = of(false);
  isTutor$: Observable<boolean> = of(false);
  isStudent$: Observable<boolean> = of(false);

  constructor(private authService: AuthService) {
    this.isAdmin$ = this.authService.isAdmin();
    this.isTutor$ = this.authService.isTutor();
    this.isStudent$ = this.authService.isStudent();
  }
}
