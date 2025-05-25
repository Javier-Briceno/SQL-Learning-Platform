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
  isTutorMode = false;
  
  RegisterForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    name: new FormControl('', [Validators.required]),
    tutorKey: new FormControl('')
  });
  
  // Fehlerbehandlung hinzufügen
  errorMessage: string | null = null;
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}
  
  toggleTutorMode() {
    this.isTutorMode = !this.isTutorMode;
    
    if (this.isTutorMode) {
      this.RegisterForm.get('tutorKey')?.setValidators([Validators.required]);
    } else {
      this.RegisterForm.get('tutorKey')?.clearValidators();
      this.RegisterForm.get('tutorKey')?.setValue('');
    }
    
    this.RegisterForm.get('tutorKey')?.updateValueAndValidity();
  }

  onSubmit() {
    if (this.RegisterForm.valid) {
      this.loading = true;
      this.errorMessage = null;
      
      // Tutorenschlüssel nur hinzufügen, wenn im Tutor-Modus
      const formData = {
        email: this.RegisterForm.get('email')?.value,
        password: this.RegisterForm.get('password')?.value,
        name: this.RegisterForm.get('name')?.value,
        ...(this.isTutorMode && { tutorKey: this.RegisterForm.get('tutorKey')?.value })
      };
      
      this.authService.register(formData as any)
        .subscribe({
          next: () => {
            // Nach erfolgreicher Registrierung wird automatisch zur Login-Seite navigiert
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
