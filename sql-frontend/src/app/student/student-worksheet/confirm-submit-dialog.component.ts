import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmSubmitData {
  worksheetTitle: string;
  taskCount: number;
  answeredCount: number;
}

@Component({
  selector: 'app-confirm-submit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="dialog-content">
      <div class="dialog-header">
        <mat-icon color="warn" class="warning-icon">warning</mat-icon>
        <h2 mat-dialog-title>Übungsblatt abgeben?</h2>
      </div>
      
      <div mat-dialog-content>
        <p>Sie sind dabei, das Übungsblatt <strong>"{{ data.worksheetTitle }}"</strong> abzugeben.</p>
        
        <div class="submission-summary">
          <div class="summary-item">
            <mat-icon>assignment</mat-icon>
            <span>Gesamt: {{ data.taskCount }} Aufgaben</span>
          </div>
          <div class="summary-item">
            <mat-icon [color]="data.answeredCount === data.taskCount ? 'accent' : 'warn'">
              {{ data.answeredCount === data.taskCount ? 'check_circle' : 'radio_button_unchecked' }}
            </mat-icon>
            <span>Beantwortet: {{ data.answeredCount }} von {{ data.taskCount }}</span>
          </div>
        </div>
        
        <div class="warning-message" *ngIf="data.answeredCount < data.taskCount">
          <mat-icon color="warn">info</mat-icon>
          <p>
            Sie haben noch nicht alle Aufgaben beantwortet. 
            Sie können das Übungsblatt trotzdem abgeben, aber nicht mehr bearbeiten.
          </p>
        </div>
        
        <p class="final-warning">
          <strong>Achtung:</strong> Nach dem Abgeben können Sie Ihre Antworten nicht mehr ändern!
        </p>
      </div>
      
      <div mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          <mat-icon>cancel</mat-icon>
          Abbrechen
        </button>
        <button mat-raised-button color="accent" (click)="onConfirm()">
          <mat-icon>send</mat-icon>
          Jetzt abgeben
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-content {
      max-width: 500px;
    }
    
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      
      .warning-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
      }
      
      h2 {
        margin: 0;
        color: #333;
      }
    }
    
    .submission-summary {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
      
      .summary-item {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }
    
    .warning-message {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 12px;
      margin: 16px 0;
      
      mat-icon {
        margin-top: 2px;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      
      p {
        margin: 0;
        color: #856404;
        line-height: 1.4;
      }
    }
    
    .final-warning {
      color: #d32f2f;
      font-weight: 500;
      margin: 16px 0 0 0;
      
      strong {
        color: #d32f2f;
      }
    }
    
    [mat-dialog-actions] {
      padding-top: 24px;
      
      button {
        margin-left: 8px;
        
        &:first-child {
          margin-left: 0;
        }
      }
    }
  `]
})
export class ConfirmSubmitDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmSubmitDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmSubmitData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
