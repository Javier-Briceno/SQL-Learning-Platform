// Dieses DTO (Data Transfer Object) wird verwendet, um die Registrierungsdaten eines Benutzers zu validieren.
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() // Überprüft, ob die E-Mail-Adresse gültig ist
  email: string;

  @IsString() // Überprüft, ob das Passwort ein String ist
  @MinLength(6) // Stellt sicher, dass das Passwort mindestens 6 Zeichen lang ist
  password: string;

  @IsString() // Überprüft, ob der Name ein String ist
  name: string;
}
