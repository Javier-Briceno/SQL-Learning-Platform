import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default: any;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

interface Constraint {
  name: string;
  type: string;
  column: string;
  foreignTable?: string;
  foreignColumn?: string;
}

interface Index {
  name: string;
  definition: string;
}

interface Table {
  schema: string;
  name: string;
  owner: string;
  size: string;
  columns: Column[];
  constraints: Constraint[];
  indexes: Index[];
  rowCount: number;
  sampleData: any[];
}

interface DatabaseSchema {
  databaseInfo: {
    database_name: string;
    current_user: string;
    version: string;
  };
  tables: Table[];
  indexes: Index[];
  sequences: any[];
}

@Component({
  selector: 'app-database-schema',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTableModule,
    MatExpansionModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  templateUrl: './database-schema.component.html',
  styleUrls: ['./database-schema.component.scss']
})
export class DatabaseSchemaComponent implements OnInit {
  dbName: string = '';
  schema: DatabaseSchema | null = null;
  loading: boolean = true;
  error: string | null = null;

  // Columns für verschiedene Tabellen
  columnsDisplayedColumns: string[] = ['name', 'type', 'nullable', 'default'];
  constraintsDisplayedColumns: string[] = ['name', 'type', 'column', 'reference'];
  indexesDisplayedColumns: string[] = ['name', 'definition'];
  sampleDataColumns: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.dbName = params['dbName'];
      if (this.dbName) {
        this.loadSchema();
      }
    });
  }

  async loadSchema(): Promise<void> {
    this.loading = true;
    this.error = null;

    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<DatabaseSchema>(
        `http://localhost:3000/sql/inspect-postgres/${this.dbName}`,
        { headers }
      ).toPromise();

      this.schema = response || null;
      console.log('Schema loaded:', this.schema);
    } catch (error: any) {
      console.error('Fehler beim Laden des Schemas:', error);
      this.error = error?.error?.message || 'Fehler beim Laden des Datenbankschemas';
      if (this.error) {
        this.showError(this.error);
      }
    } finally {
      this.loading = false;
    }
  }

  getSampleDataColumns(table: Table): string[] {
    if (table.sampleData && table.sampleData.length > 0) {
      return Object.keys(table.sampleData[0]);
    }
    return [];
  }

  getConstraintTypeColor(type: string): string {
    switch (type.toLowerCase()) {
      case 'primary key': return 'primary';
      case 'foreign key': return 'accent';
      case 'unique': return 'warn';
      case 'check': return '';
      default: return '';
    }
  }

  getConstraintReference(constraint: Constraint): string {
    if (constraint.foreignTable && constraint.foreignColumn) {
      return `${constraint.foreignTable}.${constraint.foreignColumn}`;
    }
    return '-';
  }

  formatDataType(column: Column): string {
    let type = column.type.toUpperCase();
    
    if (column.maxLength) {
      type += `(${column.maxLength})`;
    } else if (column.precision && column.scale !== null && column.scale !== undefined) {
      type += `(${column.precision},${column.scale})`;
    } else if (column.precision) {
      type += `(${column.precision})`;
    }
    
    return type;
  }

  goBack(): void {
    this.router.navigate(['/tutor-dashboard/datenbanken']);
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 7000,
      panelClass: ['error-snackbar']
    });
  }
}
