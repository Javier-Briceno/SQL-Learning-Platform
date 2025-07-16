import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO für das Generieren von Aufgaben per KI
 */
export class GenerateTaskDto {
  @IsString()
  @IsNotEmpty()
  /** 
   * Thema, zu dem die KI eine SQL-Aufgabe erstellen soll.
   * Beispiel: "Join-Operator", "Group By", "Window Functions" 
   */
  topic: string;

  @IsString()
  @IsNotEmpty()
  /**
   * Gewünschter Schwierigkeitsgrad der Aufgabe.
   * Beispiel: "leicht", "mittel", "schwer"
   */
  difficulty: string;

  @IsString()
  @IsNotEmpty()
  /** Name der PostgreSQL-Datenbank, in der die Tabellen liegen */
  database: string;

  @IsString()
  @IsNotEmpty()
  /** Zufälliger Noise-Wert für bessere Entropie */
  noise: string;
}
