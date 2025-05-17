// Dieses DTO (Data Transfer Object) wird verwendet, um die Login-Daten eines Benutzers zu validieren.
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail() // Überprüft, ob die E-Mail-Adresse gültig ist
  email: string;

  @IsString() // Überprüft, ob das Passwort ein String ist
  password: string;
}