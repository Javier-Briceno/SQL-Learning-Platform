import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-database-content-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Datenbank: {{ data.dbName }}</h2>
    <mat-dialog-content>
      <div *ngFor="let table of data.content">
        <h3>{{ table.name }}</h3>
        <table>
          <thead>
            <tr>
              <th *ngFor="let col of table.columns">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of table.rows">
              <td *ngFor="let col of table.columns">{{ row[col] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
  <button class="close-db-content-btn" (click)="dialogRef.close()">Schließen</button>
</mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { max-height: 60vh; overflow: auto; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th, td { border: 1px solid #ddd; padding: 4px 8px; }
    th { background: #f5f5f5; }
    h3 { margin-top: 16px; }

    .close-db-content-btn {
      background-color: #1976d2;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.3s ease;
      margin-top: 16px;
      margin-bottom: 8px;
      margin-right: 8px;
      flex-shrink: 0;
    }
    .close-db-content-btn:hover:not(:disabled) {
      background-color: #1251a3;
    }
    .close-db-content-btn:disabled {
      background-color: #bbdefb;
      cursor: not-allowed;
    }
  `]
})

export class DatabaseContentDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DatabaseContentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
}