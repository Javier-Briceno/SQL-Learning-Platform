import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './auth/auth.service';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, MatIconModule, MatButtonModule, MatMenuModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  public currentUrl = '';
  public isAdmin$: Observable<boolean> = of(false);
  public isTutor$: Observable<boolean> = of(false);
  public isLoggedIn = false;
  public userName = '';

  constructor(private authService: AuthService, private router: Router) {
    this.currentUrl = this.router.url;
    this.router.events.subscribe(() => {
      this.currentUrl = this.router.url;
    });
  }

  ngOnInit(): void {
    this.isAdmin$ = this.authService.isAdmin();
    this.isTutor$ = this.authService.isTutor();
    this.isLoggedIn = this.authService.isLoggedIn();

      // Benutzername für das Menü laden
      this.authService.user$.subscribe(user => {
        if (user) {
          this.userName = user.name;
        }
      });
    }

  logout() {
    this.authService.logout();
  }
}
