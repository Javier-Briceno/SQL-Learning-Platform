import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-admin-dashboard',
    templateUrl: './admin-dashboard.component.html',
    styleUrls: ['./admin-dashboard.component.scss'],
    imports: [MatIconModule, MatButtonModule, MatToolbar, MatSidenavModule, MatListModule, RouterModule],
    standalone: true
})

export class AdminDashboardComponent {


    constructor(private router: Router) { }


    ngOnInit(): void { }


    goBack(): void {
        this.router.navigate(['/overview']);
    }

    // Methode um alle Benutzer zu laden
    loadUsers(): void { }


    // Methode um die Rollen eines Benutzers zu ändern
    changeRole(): void { }


    // Methode um einen Benutzer zu sperren
    suspendUser(): void { }


    // Methode um einen Benutzer zu entsperren
    unsuspendUser(): void { }

    goHome(): void {
        this.router.navigate(['/overview']);
    }
}


