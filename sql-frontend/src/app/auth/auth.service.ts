import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Router } from '@angular/router';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  tutorKey?: string; // Optional für Tutor-Registrierung
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
  }  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          // Token speichern
          this.saveToken(response.access_token);
          
          // Je nach Benutzerrolle zu verschiedenen Dashboards navigieren
          // Dies wird basierend auf dem User-Objekt entschieden, das noch geladen werden muss
          this.getProfile().subscribe(user => {
            if (user.role === 'ADMIN') {
              this.router.navigate(['/admin']);
            } else if (user.role === 'TUTOR') {
              this.router.navigate(['/tutor-dashboard']);
            } else {
              this.router.navigate(['/profile']);
            }
          });
        }),
        catchError(error => {
          console.error('Login fehlgeschlagen', error);
          
          if (error.status === 401) {
            return throwError(() => new Error('Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.'));
          } else if (error.status === 404) {
            return throwError(() => new Error('Benutzer nicht gefunden. Bitte überprüfen Sie Ihre E-Mail oder registrieren Sie sich.'));
          } else if (error.status === 400) {
            return throwError(() => new Error('Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingaben.'));
          } else if (error.status === 500) {
            return throwError(() => new Error('Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.'));
          } else if (!navigator.onLine) {
            return throwError(() => new Error('Keine Internetverbindung. Bitte überprüfen Sie Ihre Netzwerkeinstellungen.'));
          }
          
          // Allgemeiner Fallback
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
          
          // Spezifischere Fehlermeldungen basierend auf dem Fehlercode oder der Fehlernachricht
          if (error.status === 409) {
            return throwError(() => new Error('Ein Benutzer mit dieser E-Mail existiert bereits. Bitte verwenden Sie eine andere E-Mail-Adresse.'));
          } else if (error.status === 400) {
            // Wenn die Backend-Antwort Validierungsfehler enthält
            if (error.error?.message) {
              if (Array.isArray(error.error.message)) {
                // Wenn es ein Array von Validierungsfehlern ist
                const validationErrors = error.error.message.join(', ');
                return throwError(() => new Error(`Validierungsfehler: ${validationErrors}`));
              } else {
                return throwError(() => new Error(`Fehler: ${error.error.message}`));
              }
            } else if (error.error?.errors) {
              // Alternative Validierungsfehlerstruktur
              const errorMessages = Object.values(error.error.errors).flat().join(', ');
              return throwError(() => new Error(`Validierungsfehler: ${errorMessages}`));
            }
            
            // Fallback für allgemeine 400-Fehler
            return throwError(() => new Error('Die eingegebenen Daten sind ungültig. Bitte überprüfen Sie Ihre Eingaben.'));
          } else if (error.status === 500) {
            return throwError(() => new Error('Es ist ein Serverfehler aufgetreten. Bitte versuchen Sie es später erneut.'));
          } else if (!navigator.onLine) {
            return throwError(() => new Error('Keine Internetverbindung. Bitte überprüfen Sie Ihre Netzwerkeinstellungen.'));
          }
          
          // Allgemeiner Fallback
          return throwError(() => new Error('Registrierung fehlgeschlagen. Bitte versuchen Sie es später erneut.'));
        })
      );
  }

  // Explizite Methode zum Speichern des Tokens
  saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.isAuthenticatedSubject.next(true);
  }

  // Methode zum Entfernen des Tokens (ersetzt die Funktionalität in logout)
  removeToken(): void {
    localStorage.removeItem(this.tokenKey);
    this.isAuthenticatedSubject.next(false);
  }
  // Prüft, ob ein Benutzer eingeloggt ist
  isLoggedIn(): boolean {
    return this.hasToken();
  }
  
  // Prüft, ob der eingeloggte Benutzer die angegebene Rolle hat
  hasRole(role: string): Observable<boolean> {
    if (!this.isLoggedIn()) {
      return of(false);
    }
    
    return this.getProfile().pipe(
      map(user => user.role === role),
      catchError(() => of(false))
    );
  }
  
  // Prüft, ob der eingeloggte Benutzer ein Admin ist
  isAdmin(): Observable<boolean> {
    return this.user$.pipe(map(user => user?.role === 'ADMIN'));
  }
  
  // Prüft, ob der eingeloggte Benutzer ein Tutor ist
  isTutor(): Observable<boolean> {
    return this.user$.pipe(map(user => user?.role === 'TUTOR'));
  }

  logout(): void {
    this.removeToken();
    this.userSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }  // Methode zum Abrufen des Benutzerprofils
  getProfile(): Observable<UserProfile> {
    return this.http.get<any>(`${this.apiUrl}/profile`)
      .pipe(
        map(response => {
          // Backend gibt { user: {...} } zurück, wir müssen das User-Objekt extrahieren
          const user = response.user || response;
          this.userSubject.next(user);
          return user;
        }),
        catchError(error => {
          console.error('Fehler beim Abrufen des Profils', error);
          return throwError(() => new Error('Fehler beim Abrufen des Benutzerprofils.'));
        })
      );
  }
}
