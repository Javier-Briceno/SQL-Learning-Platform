import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { UserManagementComponent } from './pages/admin/user-management/user-management.component';
import { SettingsManagementComponent } from './pages/admin/settings-management/settings-management.component';
import { TutorDashboardComponent } from './tutor-dashboard/tutor-dashboard.component';
import { StudentOverviewComponent } from './tutor-dashboard/student-overview/student-overview.component';
import { MeineAufgabenComponent } from './tutor-dashboard/meine-aufgaben/meine-aufgaben.component';
import { ProfileComponent } from './user/profile/profile.component';
import { authGuard } from './auth/auth.guard';
import { SqlUploadComponent } from './tutor-dashboard/sql-upload/sql-upload.component';
import { DatenbankenComponent } from './tutor-dashboard/datenbanken/datenbanken.component';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [authGuard],
    // data: { roles: ['ADMIN'] } wenn Rollenüberprüfung implementiert ist
    children: [
      { path: 'users', component: UserManagementComponent },
      { path: 'settings', component: SettingsManagementComponent },
    ]
  },
  { path: 'tutor-dashboard', component: TutorDashboardComponent, 
    canActivate: [authGuard],
    children: [
    { path: 'students', component: StudentOverviewComponent },
    { path: 'aufgaben', component: MeineAufgabenComponent },
    { path: 'upload', component: SqlUploadComponent },
    { path: 'datenbanken', component: DatenbankenComponent },
  ] },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
];
