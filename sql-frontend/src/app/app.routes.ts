import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { UserManagementComponent } from './pages/admin/user-management.component';
import { SettingsManagementComponent } from './pages/admin/settings-management.component';

export const routes: Routes = [
  {
    path: 'admin',
    component: AdminDashboardComponent,
    // canActivate: [AuthGuard], wenn der AuthGuard implementiert ist
    // data: { roles: ['ADMIN'] } wenn Rollenüberprüfung implementiert ist
    children: [
      { path: 'users', component: UserManagementComponent },
      { path: 'settings', component: SettingsManagementComponent },
    ]
  },
];
