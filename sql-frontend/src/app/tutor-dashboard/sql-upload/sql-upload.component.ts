import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-sql-upload',
    standalone: true,
    imports: [
        FormsModule,
        CommonModule
    ],
    templateUrl: './sql-upload.component.html',
    styleUrls: ['./sql-upload.component.scss']
})

export class SqlUploadComponent {

    selectedFile: File | null = null;
    uploading: boolean = false;
    errorMsg = '';
    uploadSuccess = false;

    constructor(private http: HttpClient) { }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            if (file.name.endsWith('.sql')) {
                this.selectedFile = file;
                this.errorMsg = '';
                this.uploadSuccess = false;
            } else {
                this.errorMsg = 'Nur .sql-Dateien erlaubt.';
                this.selectedFile = null;
            }
        }
    }

    onSubmit(): void {
        if (!this.selectedFile) {
            this.errorMsg = 'Bitte wählen Sie eine Datei aus.';
            return;
        }

        this.uploading = true;
        this.errorMsg = '';
        this.uploadSuccess = false;

        const formData = new FormData();
        formData.append('file', this.selectedFile, this.selectedFile.name);

        this.http.post('/sql/upload', formData).subscribe({
            next: (response) => {
                console.log('Upload erfolgreich:', response);
                this.uploading = false;
                this.uploadSuccess = true;
            },
            error: (error: HttpErrorResponse) => {
                console.error('Upload fehlgeschlagen:', error);
                this.errorMsg = 'Fehler beim Hochladen der Datei.';
                this.uploading = false;
                this.uploadSuccess = false;
            }
        });
    }
}