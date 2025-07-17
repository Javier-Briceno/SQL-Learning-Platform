import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

interface TableSchema {
  name: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
  }[];
}

@Component({
  selector: 'app-database-schema-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Datenbankschema: {{ data.dbName }}</h2>
    <mat-dialog-content>
      <div *ngFor="let table of data.schema" class="table-schema">
        <h3 class="table-name">{{ table.name }}</h3>
        <table class="schema-table">
          <thead>
            <tr>
              <th>Spalte</th>
              <th>Datentyp</th>
              <th>Nullable</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let column of table.columns">
              <td class="column-name">{{ column.name }}</td>
              <td class="column-type">{{ column.type }}</td>
              <td class="column-nullable">
                <span [ngClass]="column.nullable ? 'nullable-yes' : 'nullable-no'">
                  {{ column.nullable ? 'JA' : 'NEIN' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="close-schema-btn" (click)="dialogRef.close()">Schließen</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { 
      max-height: 70vh; 
      overflow: auto; 
      padding: 16px;
    }
    
    .table-schema {
      margin-bottom: 24px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      background-color: #fafafa;
    }
    
    .table-name {
      margin: 0 0 12px 0;
      color: #1976d2;
      font-weight: 600;
      font-size: 18px;
      border-bottom: 2px solid #1976d2;
      padding-bottom: 4px;
    }
    
    .schema-table { 
      border-collapse: collapse; 
      width: 100%; 
      background-color: white;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .schema-table th, 
    .schema-table td { 
      border: 1px solid #ddd; 
      padding: 8px 12px; 
      text-align: left;
    }
    
    .schema-table th { 
      background-color: #f5f5f5; 
      font-weight: 600;
      color: #424242;
    }
    
    .column-name {
      font-family: monospace;
      font-weight: 500;
    }
    
    .column-type {
      font-family: monospace;
      color: #2e7d32;
      font-weight: 500;
    }
    
    .nullable-yes {
      color: #ff9800;
      font-weight: 500;
    }
    
    .nullable-no {
      color: #4caf50;
      font-weight: 500;
    }

    .close-schema-btn {
      background-color: #1976d2;
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.3s ease;
      margin: 8px;
      font-weight: 500;
    }
    
    .close-schema-btn:hover:not(:disabled) {
      background-color: #1251a3;
    }
    
    .close-schema-btn:disabled {
      background-color: #bbdefb;
      cursor: not-allowed;
    }
  `]
})

export class DatabaseSchemaDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DatabaseSchemaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { dbName: string, schema: TableSchema[] }
  ) {}
}
