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
    MatTabsModule
  ],
  templateUrl: './sql-query-executor.component.html',
  styleUrl: './sql-query-executor.component.scss'
})
export class SqlQueryExecutorComponent implements OnInit {
  private baseUrl = 'http://localhost:3000/sql';

  // Form für SQL Query Input
  queryForm = new FormGroup({
    database: new FormControl('', [Validators.required]),
    query: new FormControl('', [Validators.required, Validators.minLength(1)])
  });

  // Verfügbare Datenbanken
  databases: string[] = [];
  
  // Query Execution State
  isExecuting = false;
  
  // Ergebnisse
  queryResult: QueryResult | null = null;
  executionError: string | null = null;
  
  // Loading States
  isLoadingDatabases = false;
  
  // Query History (für spätere Erweiterung)
  queryHistory: { query: string; database: string; timestamp: Date; success: boolean }[] = [];

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
          this.addToHistory(queryRequest.query, queryRequest.database, true);
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler bei der Query-Ausführung:', err);
          this.executionError = err.error?.message || err.message || 'Fehler bei der Query-Ausführung';
          this.isExecuting = false;
          
          // Fehlgeschlagene Query zur Historie hinzufügen
          this.addToHistory(queryRequest.query, queryRequest.database, false);
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
  private addToHistory(query: string, database: string, success: boolean): void {
    this.queryHistory.unshift({
      query,
      database,
      timestamp: new Date(),
      success
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

  // Getter für einfacheren Template-Zugriff
  get queryControl() { return this.queryForm.get('query'); }
  get databaseControl() { return this.queryForm.get('database'); }
}
