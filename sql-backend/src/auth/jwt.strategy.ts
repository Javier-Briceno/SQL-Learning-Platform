// src/auth/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';     // NestJS-Dekoratoren & Exceptions
import { PassportStrategy } from '@nestjs/passport';                    // Basisklasse für Passport-Strategien
import { Strategy, ExtractJwt } from 'passport-jwt';                     // JWT-Strategy und Token-Extractor
import { ConfigService } from '@nestjs/config';                         // Zugriff auf Umgebungsvariablen
import { AuthService } from './auth.service';                           // Service, um User-Daten zu validieren

@Injectable()  // Markiert die Klasse als Provider, damit Nest sie injizieren kann
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,   // ConfigService liefert JWT_SECRET, Ablaufzeiten, etc.
    private readonly authService: AuthService // AuthService für weitere Payload-Validierung (optional)
  ) {
    // Sicherstellen, dass das Secret gesetzt ist, bevor super() aufgerufen wird
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in the environment');
    }

    // Konfiguration der Strategy:
    // - jwtFromRequest: legt fest, woher das Token kommt (Bearer-Token im Authorization-Header)
    // - ignoreExpiration: ob abgelaufene Tokens ignoriert werden (hier: false → abgelaufene Token schlagen fehl)
    // - secretOrKey: Secret zum Verifizieren der Signatur
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * validate() wird von Passport nach erfolgreicher Token-Verifizierung aufgerufen.
   * Hier wandeln wir den rohen Payload in ein User-Objekt um, das in req.user landet.
   *
   * @param payload - das Decoded JWT-Payload (z.B. { sub, email, role, iat, exp })
   * @returns ein Objekt mit den User-Daten, die im Request verfügbar sein sollen
   */
  async validate(payload: any) {
    // Einfaches Mapping der Payload-Felder:
    // - payload.sub → User-ID
    // - payload.email → E-Mail-Adresse
    // - payload.role → Benutzerrolle (z.B. 'admin', 'user' etc.)
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
