import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

// DTO für Datenbankmanipulation-Anfragen
export class ExecuteManipulationDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsString()
  @IsNotEmpty()
  database: string;

  @IsOptional()
  @IsBoolean()
  resetDatabase?: boolean;
}

// Response-Interface für Manipulation-Ergebnisse
export interface ManipulationResult {
  success: boolean;
  message: string;
  affectedRows: number;
  executionTime: number;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP';
  resetPerformed: boolean;
  // Für SELECT-Queries: Daten zurückgeben
  columns?: string[];
  rows?: any[];
}

// Interface für Datenbank-Kopie Informationen
export interface DatabaseCopyInfo {
  originalDatabase: string;
  copyDatabase: string;
  userId: number;
  createdAt: Date;
  lastUsed: Date | null;
  expiresAt: Date;
}
