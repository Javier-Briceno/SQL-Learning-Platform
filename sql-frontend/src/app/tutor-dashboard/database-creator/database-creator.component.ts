import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

interface CreateDatabaseRequest {
  dbName: string;
  description?: string;
  sqlScript: string;
}

interface CreateDatabaseResponse {
  dbName: string;
  success: boolean;
  message: string;
  tablesCreated?: string[];
}

@Component({
  selector: 'app-database-creator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './database-creator.component.html',
  styleUrls: ['./database-creator.component.scss']
})
export class DatabaseCreatorComponent {
  dbName: string = '';
  description: string = '';
  sqlScript: string = '';
  isCreating: boolean = false;
  lastCreatedDatabase: CreateDatabaseResponse | null = null;

  // Beispiel-SQL-Scripts für PostgreSQL
  exampleScripts = [
    {
      name: 'Einfache Benutzertabelle',
      sql: `-- Benutzer-Tabelle erstellen
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Beispieldaten einfügen
INSERT INTO users (name, email) VALUES 
    ('Max Mustermann', 'max@example.com'),
    ('Anna Schmidt', 'anna@example.com'),
    ('Tom Weber', 'tom@example.com');`
    },
    {
      name: 'E-Commerce Basis',
      sql: `-- Produktkategorien
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Produkte
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Beispieldaten
INSERT INTO categories (name, description) VALUES 
    ('Elektronik', 'Elektronische Geräte'),
    ('Bücher', 'Alle Arten von Büchern'),
    ('Kleidung', 'Mode und Accessoires');

INSERT INTO products (name, price, category_id, stock_quantity) VALUES 
    ('Laptop', 999.99, 1, 10),
    ('SQL Handbuch', 29.99, 2, 50),
    ('T-Shirt', 19.99, 3, 100);`
    },
    {
      name: 'Universitätsverwaltung',
      sql: `-- Studenten
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    student_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    enrollment_date DATE DEFAULT CURRENT_DATE
);

-- Kurse
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(10) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    credits INTEGER NOT NULL,
    instructor VARCHAR(100)
);

-- Einschreibungen
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    course_id INTEGER REFERENCES courses(id),
    grade DECIMAL(3,2),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    UNIQUE(student_id, course_id)
);

-- Beispieldaten
INSERT INTO students (student_number, first_name, last_name, email) VALUES 
    ('ST001', 'Maria', 'Garcia', 'maria.garcia@uni.de'),
    ('ST002', 'John', 'Smith', 'john.smith@uni.de'),
    ('ST003', 'Lisa', 'Wang', 'lisa.wang@uni.de');

INSERT INTO courses (course_code, title, credits, instructor) VALUES 
    ('CS101', 'Einführung in die Informatik', 6, 'Prof. Dr. Müller'),
    ('DB201', 'Datenbanksysteme', 8, 'Prof. Dr. Schmidt'),
    ('WEB301', 'Web-Entwicklung', 6, 'Dr. Brown');

INSERT INTO enrollments (student_id, course_id, grade) VALUES 
    (1, 1, 1.7),
    (1, 2, 2.0),
    (2, 1, 1.3),
    (3, 2, 1.0),
    (3, 3, 1.7);`
    }
  ];

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  // Beispiel-SQL laden
  loadExample(script: string): void {
    this.sqlScript = script;
  }

  // SQL-Script validieren
  validateSqlScript(): boolean {
    if (!this.sqlScript.trim()) {
      this.showError('SQL-Script darf nicht leer sein');
      return false;
    }

    const script = this.sqlScript.toLowerCase();
    
    // Prüfe auf verbotene Befehle
    const forbidden = ['drop database', 'create database', 'drop user', 'create user'];
    for (const cmd of forbidden) {
      if (script.includes(cmd)) {
        this.showError(`Befehl "${cmd.toUpperCase()}" ist nicht erlaubt`);
        return false;
      }
    }

    return true;
  }

  // Datenbankname validieren
  validateDbName(): boolean {
    if (!this.dbName.trim()) {
      this.showError('Datenbankname darf nicht leer sein');
      return false;
    }

    const namePattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!namePattern.test(this.dbName)) {
      this.showError('Datenbankname muss mit Buchstabe beginnen und darf nur Buchstaben, Zahlen und Unterstriche enthalten');
      return false;
    }

    if (this.dbName.length < 3 || this.dbName.length > 63) {
      this.showError('Datenbankname muss zwischen 3 und 63 Zeichen lang sein');
      return false;
    }

    return true;
  }

  // Datenbank erstellen
  async createDatabase(): Promise<void> {
    if (!this.validateDbName() || !this.validateSqlScript()) {
      return;
    }

    this.isCreating = true;
    this.lastCreatedDatabase = null;

    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const request: CreateDatabaseRequest = {
      dbName: this.dbName.trim(),
      description: this.description.trim() || undefined,
      sqlScript: this.sqlScript.trim()
    };

    try {
      const response = await this.http.post<CreateDatabaseResponse>(
        'http://localhost:3000/sql/create-database', 
        request, 
        { headers }
      ).toPromise();

      if (response && response.success) {
        this.lastCreatedDatabase = response;
        this.showSuccess(response.message);
        this.resetForm();
      } else {
        this.showError('Unbekannter Fehler beim Erstellen der Datenbank');
      }
    } catch (error: any) {
      console.error('Fehler beim Erstellen der Datenbank:', error);
      let errorMessage = 'Fehler beim Erstellen der Datenbank';
      
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      this.showError(errorMessage);
    } finally {
      this.isCreating = false;
    }
  }

  // Formular zurücksetzen
  resetForm(): void {
    this.dbName = '';
    this.description = '';
    this.sqlScript = '';
  }

  // Erfolg anzeigen
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }

  // Fehler anzeigen
  private showError(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: 7000,
      panelClass: ['error-snackbar']
    });
  }
}
