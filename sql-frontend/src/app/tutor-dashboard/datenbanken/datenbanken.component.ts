import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { DatabaseContentDialogComponent } from './database-content-dialog.component';

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
  selectedDbContent: any = null;
  selectedDbName: string | null = null;

  constructor(private http: HttpClient, private dialog: MatDialog) { }

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
  onDeleteDatabase(dbName: string): void {

    // Sicherheitsabfrage vor dem Löschen
    if (confirm(`Sind Sie sicher, dass Sie die Datenbank '${dbName}' unwiderruflich löschen möchten?`)) {
      this.isLoading = true; 
      this.errorMsg = null;  

      // DELETE-Anfrage an das Backend senden
      this.http.delete<void>(`${this.baseUrl}/delete/${dbName}`) 
        .subscribe({
          next: () => {
            console.log(`Datenbank ${dbName} erfolgreich gelöscht.`);
            this.isLoading = false;
            this.loadDatabases(); 
          },
          error: (err: HttpErrorResponse) => {
            console.error(`Fehler beim Löschen der Datenbank ${dbName}:`, err);
          }
        });
    }
  }

  onShowDatabase(dbName: string): void {
  this.isLoading = true;
  this.http.get<any[]>(`${this.baseUrl}/inspect/${dbName}`)
    .subscribe({
      next: (tables) => {
        this.isLoading = false;
        this.dialog.open(DatabaseContentDialogComponent, {
          width: '80vw',
          maxHeight: '80vh',
          data: { dbName, content: tables }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg = err.error?.message || err.message || 'Fehler beim Laden des Datenbankinhalts.';
        this.isLoading = false;
      }
    });
}

  closeDbContent(): void {
  this.selectedDbContent = null;
  this.selectedDbName = null;
  }
}
