import { Component } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './auth/auth.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, MatIconModule, MatButtonModule, MatMenuModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  public currentUrl = '';

  constructor(private authService: AuthService, private router: Router) {
    this.currentUrl = this.router.url;
    this.router.events.subscribe(() => {
      this.currentUrl = this.router.url;
    });
  }

  logout() {
    this.authService.logout();
  }
}
