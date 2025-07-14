import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface Task {
  id: number;
  title: string;
  description: string;
  tutor: {
    name: string;
    email: string;
  };
}

@Component({
  selector: 'app-aufgaben-managment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCard,
    MatTableModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './aufgaben-managment.component.html',
  styleUrl: './aufgaben-managment.component.scss'
})
export class AufgabenManagmentComponent implements OnInit {
  loading = false;
  error: string | null = null;
  searchTerm: string = '';
  tasks: Task[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks() {
    this.loading = true;
    this.error = null;
    this.http.get<any[]>('http://localhost:3000/worksheets/public/all').subscribe({
      next: (worksheets) => {
        this.tasks = worksheets.map(w => ({
          id: w.id,
          title: w.title,
          description: w.description,
          tutor: {
            name: w.tutor?.name || '',
            email: w.tutor?.email || ''
          }
        }));
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Fehler beim Laden der Aufgaben';
        this.loading = false;
      }
    });
  }

  get filteredTasks(): Task[] {
    const term = this.searchTerm.toLowerCase();
    return this.tasks.filter(
      t =>
        t.title.toLowerCase().includes(term) ||
        (t.description || '').toLowerCase().includes(term) ||
        t.tutor.name.toLowerCase().includes(term) ||
        t.tutor.email.toLowerCase().includes(term)
    );
  }

  editTask(task: Task) {
    // Navigiere zur Bearbeitungsseite des Übungsblatts (z.B. Worksheet-Editor)
    this.router.navigate(['/tutor-dashboard/worksheets/edit', task.id]);
  }

  deleteTask(task: Task) {
  if (!confirm(`Soll die Aufgabe "${task.title}" wirklich gelöscht werden?`)) return;
  this.loading = true;
  this.http.delete(`http://localhost:3000/worksheets/${task.id}`).subscribe({
    next: () => {
      this.tasks = this.tasks.filter(t => t.id !== task.id);
      this.loading = false;
    },
    error: (err) => {
      this.error = 'Fehler beim Löschen der Aufgabe';
      this.loading = false;
    }
  });
}
}