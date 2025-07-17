import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';

interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime?: number;
}

interface QueryRequest {
  query: string;
  database: string;
}

interface ManipulationRequest {
  query: string;
  database: string;
  resetDatabase?: boolean;
}

interface ManipulationResult {
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

interface DatabaseCopyInfo {
  originalDatabase: string;
  copyDatabase: string;
  userId: number;
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string;
}

@Component({
  selector: 'app-sql-query-executor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTabsModule,
    MatCheckboxModule,
    MatChipsModule,
    MatExpansionModule,
    MatTooltipModule
  ],
  templateUrl: './sql-query-executor.component.html',
  styleUrl: './sql-query-executor.component.scss'
})
export class SqlQueryExecutorComponent implements OnInit {
  private baseUrl = 'http://localhost:3000/sql';

  // Form für SQL Query Input (Read-Only)
  queryForm = new FormGroup({
    database: new FormControl('', [Validators.required]),
    query: new FormControl('', [Validators.required, Validators.minLength(1)])
  });

  // Form für Manipulation Queries
  manipulationForm = new FormGroup({
    database: new FormControl('', [Validators.required]),
    query: new FormControl('', [Validators.required, Validators.minLength(1)]),
    resetDatabase: new FormControl(false)
  });

  // Verfügbare Datenbanken
  databases: string[] = [];
  
  // Query Execution State
  isExecuting = false;
  isExecutingManipulation = false;
  
  // Ergebnisse
  queryResult: QueryResult | null = null;
  manipulationResult: ManipulationResult | null = null;
  executionError: string | null = null;
  manipulationError: string | null = null;
  
  // Loading States
  isLoadingDatabases = false;
  isLoadingCopyInfo = false;
  
  // Database Copy Info
  databaseCopyInfo: DatabaseCopyInfo | null = null;
  
  // Query History (für spätere Erweiterung)
  queryHistory: { query: string; database: string; timestamp: Date; success: boolean; type: 'read' | 'manipulation' }[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadDatabases();
  }

  // Lädt verfügbare Datenbanken
  loadDatabases(): void {
    this.isLoadingDatabases = true;
    this.http.get<string[]>(`${this.baseUrl}/databases`)
      .subscribe({
        next: (databases) => {
          this.databases = databases;
          this.isLoadingDatabases = false;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Laden der Datenbanken:', err);
          this.executionError = 'Fehler beim Laden der Datenbankliste';
          this.isLoadingDatabases = false;
        }
      });
  }

  // Führt SQL Query aus
  executeQuery(): void {
    if (this.queryForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const queryRequest: QueryRequest = {
      query: this.queryForm.value.query!.trim(),
      database: this.queryForm.value.database!
    };

    this.isExecuting = true;
    this.executionError = null;
    this.queryResult = null;

    this.http.post<QueryResult>(`${this.baseUrl}/execute`, queryRequest)
      .subscribe({
        next: (result) => {
          this.queryResult = result;
          this.isExecuting = false;
          
          // Query zur Historie hinzufügen
          this.addToHistory(queryRequest.query, queryRequest.database, true, 'read');
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler bei der Query-Ausführung:', err);
          this.executionError = err.error?.message || err.message || 'Fehler bei der Query-Ausführung';
          this.isExecuting = false;
          
          // Fehlgeschlagene Query zur Historie hinzufügen
          this.addToHistory(queryRequest.query, queryRequest.database, false, 'read');
        }
      });
  }

  // Markiert alle Form Controls als touched für Validierung
  private markFormGroupTouched(): void {
    Object.keys(this.queryForm.controls).forEach(key => {
      this.queryForm.get(key)?.markAsTouched();
    });
  }

  // Fügt Query zur Historie hinzu
  private addToHistory(query: string, database: string, success: boolean, type: 'read' | 'manipulation'): void {
    this.queryHistory.unshift({
      query,
      database,
      timestamp: new Date(),
      success,
      type
    });
    
    // Behalte nur die letzten 10 Queries
    if (this.queryHistory.length > 10) {
      this.queryHistory = this.queryHistory.slice(0, 10);
    }
  }

  // Setzt Beispielquery
  setExampleQuery(): void {
    this.queryForm.patchValue({
      query: 'SELECT * FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 5;'
    });
  }

  // Löscht aktuellen Query
  clearQuery(): void {
    this.queryForm.patchValue({ query: '' });
    this.queryResult = null;
    this.executionError = null;
  }

  // Lädt Query aus Historie
  loadFromHistory(historyItem: any): void {
    this.queryForm.patchValue({
      query: historyItem.query,
      database: historyItem.database
    });
  }

  // Exportiert Ergebnisse als CSV (für spätere Erweiterung)
  exportResults(): void {
    if (!this.queryResult) return;
    
    // Einfache CSV-Export-Logik
    const csvContent = [
      this.queryResult.columns.join(','),
      ...this.queryResult.rows.map(row => 
        this.queryResult!.columns.map(col => JSON.stringify(row[col] || '')).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query-results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // ===== NEUE METHODEN FÜR DATENBANKMANIPULATION =====

  // Führt Manipulation Query aus
  executeManipulation(): void {
    if (this.manipulationForm.invalid) {
      this.markManipulationFormGroupTouched();
      return;
    }

    const manipulationRequest: ManipulationRequest = {
      query: this.manipulationForm.value.query!.trim(),
      database: this.manipulationForm.value.database!,
      resetDatabase: this.manipulationForm.value.resetDatabase || false
    };

    this.isExecutingManipulation = true;
    this.manipulationError = null;
    this.manipulationResult = null;

    this.http.post<ManipulationResult>(`${this.baseUrl}/execute-manipulation`, manipulationRequest)
      .subscribe({
        next: (result) => {
          this.manipulationResult = result;
          this.isExecutingManipulation = false;
          
          // Query zur Historie hinzufügen
          this.addToHistory(manipulationRequest.query, manipulationRequest.database, true, 'manipulation');
          
          // Copy-Info aktualisieren
          this.loadDatabaseCopyInfo(manipulationRequest.database);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler bei der Manipulation-Ausführung:', err);
          this.manipulationError = err.error?.message || err.message || 'Fehler bei der Manipulation-Ausführung';
          this.isExecutingManipulation = false;
          
          // Fehlgeschlagene Query zur Historie hinzufügen
          this.addToHistory(manipulationRequest.query, manipulationRequest.database, false, 'manipulation');
        }
      });
  }

  // Lädt Database Copy Info
  loadDatabaseCopyInfo(database: string): void {
    if (!database) return;
    
    this.isLoadingCopyInfo = true;
    this.http.get<DatabaseCopyInfo>(`${this.baseUrl}/database-copy-info/${database}`)
      .subscribe({
        next: (info) => {
          this.databaseCopyInfo = info;
          this.isLoadingCopyInfo = false;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Laden der Copy-Info:', err);
          this.databaseCopyInfo = null;
          this.isLoadingCopyInfo = false;
        }
      });
  }

  // Setzt Database Copy zurück
  resetDatabaseCopy(database: string): void {
    if (!database) return;

    this.http.post(`${this.baseUrl}/reset-database-copy/${database}`, {})
      .subscribe({
        next: () => {
          this.databaseCopyInfo = null;
          // Erfolgsmeldung könnte hier angezeigt werden
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Zurücksetzen der Copy:', err);
          this.manipulationError = 'Fehler beim Zurücksetzen der Datenbank-Kopie';
        }
      });
  }

  // Markiert alle Manipulation Form Controls als touched für Validierung
  private markManipulationFormGroupTouched(): void {
    Object.keys(this.manipulationForm.controls).forEach(key => {
      this.manipulationForm.get(key)?.markAsTouched();
    });
  }

  // Setzt Beispiel-Manipulation Query
  setExampleManipulationQuery(): void {
    this.manipulationForm.patchValue({
      query: 'SELECT * FROM users WHERE email LIKE \'%@example.com\' ORDER BY name LIMIT 10;'
    });
  }

  // Löscht aktuellen Manipulation Query
  clearManipulationQuery(): void {
    this.manipulationForm.patchValue({ query: '' });
    this.manipulationResult = null;
    this.manipulationError = null;
  }

  // Lädt Manipulation Query aus Historie
  loadManipulationFromHistory(historyItem: any): void {
    this.manipulationForm.patchValue({
      query: historyItem.query,
      database: historyItem.database
    });
  }

  // Formatiert Datum für Anzeige
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('de-DE');
  }

  // Berechnet verbleibende Zeit bis Copy-Ablauf
  getRemainingTime(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Abgelaufen';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  // Getter für einfacheren Template-Zugriff
  get queryControl() { return this.queryForm.get('query'); }
  get databaseControl() { return this.queryForm.get('database'); }
  get manipulationQueryControl() { return this.manipulationForm.get('query'); }
  get manipulationDatabaseControl() { return this.manipulationForm.get('database'); }
  get resetDatabaseControl() { return this.manipulationForm.get('resetDatabase'); }
}
