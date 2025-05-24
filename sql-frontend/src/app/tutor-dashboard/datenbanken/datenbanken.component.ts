import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-datenbanken',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './datenbanken.component.html',
  styleUrl: './datenbanken.component.scss'
})
export class DatenbankenComponent {

  databases: string[] = [];
  isLoading: boolean = false;
  errorMsg: string | null = null;
  private baseUrl = 'http://localhost:3000/sql';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadDatabases();
  }

  // Lädt die Liste der Datenbanken vom Backend
  loadDatabases(): void {
    this.isLoading = true;
    this.errorMsg = null;
    this.http.get<string[]>(`${this.baseUrl}/databases`)
      .subscribe({
        next: (dbs) => {
          this.databases = dbs;
          this.isLoading = false;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Fehler beim Laden der Datenbanken:', err);
          this.errorMsg = err.error?.message || err.message || 'Fehler beim Laden der Datenbankliste.';
          this.isLoading = false;
        }
      });
  }

  // Zum Löschen einer Datenbank
  
  onDeleteDatabase(dbName: string): void { }
}
