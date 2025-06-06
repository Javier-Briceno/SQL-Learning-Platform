import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';


interface User {
  id: number;
  role: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  isBanned?: boolean;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [MatButtonModule,CommonModule, MatSnackBarModule, MatCardModule, MatIconModule, MatTableModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error: string | null = null;

  private apiUrl = 'http://localhost:3000/auth';

  constructor(private http: HttpClient, private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.http.get<User[]>(`${this.apiUrl}/users`).subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Fehler beim Laden der Benutzer';
        this.loading = false;
      }
    });
  }

  banUser(userId: number): void {
    this.http.patch(`${this.apiUrl}/users/${userId}/ban`, {}).subscribe({
      next: () => {
        const user = this.users.find(u => u.id === userId);
        if (user) user.isBanned = true;
        this.snackBar.open('Benutzer wurde gesperrt', 'OK', { duration: 3000 });
      },
      error: () => {
        this.error = 'Fehler beim Sperren des Benutzers';
      }
    });
  }

  unbanUser(userId: number): void {
    this.http.patch(`${this.apiUrl}/users/${userId}/unban`, {}).subscribe({
      next: () => {
        const user = this.users.find(u => u.id === userId);
        if (user) user.isBanned = false;
        this.snackBar.open('Benutzer wurde entsperrt', 'OK', { duration: 3000 });
      },
      error: () => {
        this.error = 'Fehler beim Entsperren des Benutzers';
      }
    });
  }
}
