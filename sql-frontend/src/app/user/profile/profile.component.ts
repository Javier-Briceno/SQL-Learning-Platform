import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatDividerModule, MatIconModule, MatButtonModule, MatInputModule, MatCardModule, MatFormFieldModule, MatToolbarModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  user: any = null;
  loading = true;
  error: string | null = null;
  passwordForm!: FormGroup;
  passwordChangeSuccess: string | null = null;
  passwordChangeError: string | null = null;
  isChangingPassword = false;

  selectedTab: 'profile' | 'password' = 'profile';

  constructor(private authService: AuthService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  loadUserProfile(): void {
    this.authService.getProfile().subscribe({
      next: (user) => {
        this.user = user;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Fehler beim Laden des Profils';
        this.loading = false;
        console.error(err);
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    this.isChangingPassword = true;
    this.passwordChangeSuccess = null;
    this.passwordChangeError = null;
    const { currentPassword, newPassword } = this.passwordForm.value;
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: (res) => {
        this.passwordChangeSuccess = 'Passwort erfolgreich geändert!';
        this.passwordForm.reset();
        this.isChangingPassword = false;
      },
      error: (err) => {
        this.passwordChangeError = err.error?.message || err.message || 'Fehler beim Ändern des Passworts';
        this.isChangingPassword = false;
      }
    });
  }
}
