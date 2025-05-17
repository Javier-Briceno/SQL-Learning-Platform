import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { UserManagementComponent } from './pages/admin/user-management.component';
import { SettingsManagementComponent } from './pages/admin/settings-management.component';
import { TutorDashboardComponent } from './tutor-dashboard/tutor-dashboard.component';
import { StudentOverviewComponent } from './tutor-dashboard/student-overview/student-overview.component';
import { MeineAufgabenComponent } from './tutor-dashboard/meine-aufgaben/meine-aufgaben.component';

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
  { path: 'tutor-dashboard', component: TutorDashboardComponent, children: [
    { path: 'students', component: StudentOverviewComponent },
    { path: 'aufgaben', component: MeineAufgabenComponent },
  ] },
];
