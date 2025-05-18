import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface AuthResponse {
  access_token: string;
}

interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/auth'; // Anpassen an Ihre Backend-URL
  private tokenKey = 'auth_token';
  private userSubject = new BehaviorSubject<UserProfile | null>(null);
  user$ = this.userSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromToken();
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  private loadUserFromToken(): void {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      // Hier könnten Sie den Token dekodieren, um Benutzerinformationen zu erhalten
      // In einer echten Anwendung würden Sie wahrscheinlich /auth/profile aufrufen
      this.isAuthenticatedSubject.next(true);
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          // Token speichern
          localStorage.setItem(this.tokenKey, response.access_token);
          this.isAuthenticatedSubject.next(true);
          
          // Optional: Nach Login zum Dashboard navigieren
          // Je nach Benutzerrolle könnten Sie zu verschiedenen Dashboards navigieren
          this.router.navigate(['/admin']);
        }),
        catchError(error => {
          console.error('Login fehlgeschlagen', error);
          return throwError(() => new Error('Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.'));
        })
      );
  }

  register(userData: RegisterData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData)
      .pipe(
        tap(() => {
          // Nach erfolgreicher Registrierung zum Login navigieren
          this.router.navigate(['/auth/login']);
        }),
        catchError(error => {
          console.error('Registrierung fehlgeschlagen', error);
          return throwError(() => new Error('Registrierung fehlgeschlagen. Möglicherweise wird die E-Mail bereits verwendet.'));
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.isAuthenticatedSubject.next(false);
    this.userSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Methode zum Abrufen des Benutzerprofils
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile`)
      .pipe(
        tap(user => {
          this.userSubject.next(user);
        }),
        catchError(error => {
          console.error('Fehler beim Abrufen des Profils', error);
          return throwError(() => new Error('Fehler beim Abrufen des Benutzerprofils.'));
        })
      );
  }
}
