import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });
  
  // Fehlerbehandlung
  errorMessage: string | null = null;
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = null;
      
      this.authService.login(this.loginForm.value as {email: string, password: string})
        .subscribe({
          next: (response) => {
            // Die Weiterleitung erfolgt bereits im AuthService
            this.loading = false;
          },
          error: (error) => {
            this.errorMessage = error.message || 'Login fehlgeschlagen';
            this.loading = false;
          }
        });
    }
  }
}
