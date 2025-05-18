import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  RegisterForm = new FormGroup({
    email: new FormControl('',[Validators.required, Validators.email]),
    password: new FormControl('',[Validators.required, Validators.minLength(6)]),
    name: new FormControl('',[Validators.required])
  });
  
  // Fehlerbehandlung hinzufügen
  errorMessage: string | null = null;
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    if (this.RegisterForm.valid) {
      this.loading = true;
      this.errorMessage = null;
      
      this.authService.register(this.RegisterForm.value as {email: string, password: string, name: string})
        .subscribe({
          next: () => {
            // Nach erfolgreicher Registrierung wird automatisch zur Login-Seite navigiert
            // (durch die tap()-Funktion im AuthService.register)
            this.loading = false;
          },
          error: (error) => {
            this.errorMessage = error.message || 'Registrierung fehlgeschlagen';
            this.loading = false;
          }
        });
    }
  }
}
