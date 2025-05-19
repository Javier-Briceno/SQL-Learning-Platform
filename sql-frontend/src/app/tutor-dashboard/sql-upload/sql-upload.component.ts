import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
    uploadSuccess: boolean = false;
    errorMsg = '';

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            if (file.name.endsWith('.sql')) {
                this.selectedFile = file;
                this.errorMsg = '';
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
        this.uploadSuccess = false;
        this.errorMsg = '';

        // Hier dann Post-Request an den Backend-Service senden:

        console.log('Form submitted, uploading file:', this.selectedFile.name);

    }
}