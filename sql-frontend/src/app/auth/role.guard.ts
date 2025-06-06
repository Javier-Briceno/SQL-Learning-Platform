import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { map, catchError, of } from 'rxjs';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    // Überprüfen, ob der Benutzer überhaupt eingeloggt ist
    if (!authService.isLoggedIn()) {
      router.navigate(['/auth/login']);
      return false;
    }
    
    // Überprüfen, ob der Benutzer die erforderliche Rolle hat
    return authService.getProfile().pipe(
      map(user => {
        if (user && allowedRoles.includes(user.role)) {
          return true;
        } else {
          // Wenn der Benutzer nicht die erforderliche Rolle hat, zur Übersichtsseite umleiten
          router.navigate(['/overview']);
          return false;
        }
      }),
      catchError(() => {
        router.navigate(['/auth/login']);
        return of(false);
      })
    );
  };
};

// Spezifische Guards für Admin, Tutor und Student
export const adminGuard: CanActivateFn = roleGuard(['ADMIN']);
export const tutorGuard: CanActivateFn = roleGuard(['TUTOR', 'ADMIN']); // Admin kann auch auf Tutor-Seiten zugreifen
export const studentGuard: CanActivateFn = roleGuard(['STUDENT', 'ADMIN']); // Admin kann auch auf Student-Seiten zugreifen
