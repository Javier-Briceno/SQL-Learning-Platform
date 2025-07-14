import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { UserManagementComponent } from './pages/admin/user-management/user-management.component';
import { SettingsManagementComponent } from './pages/admin/settings-management/settings-management.component';
import { TutorDashboardComponent } from './tutor-dashboard/tutor-dashboard.component';
import { StudentOverviewComponent } from './tutor-dashboard/student-overview/student-overview.component';
import { MeineAufgabenComponent } from './tutor-dashboard/meine-aufgaben/meine-aufgaben.component';
import { ProfileComponent } from './user/profile/profile.component';
import { OverviewComponent } from './pages/overview/overview.component';
import { authGuard } from './auth/auth.guard';
import { adminGuard, tutorGuard, studentGuard } from './auth/role.guard';
import { SqlUploadComponent } from './tutor-dashboard/sql-upload/sql-upload.component';
import { DatenbankenComponent } from './tutor-dashboard/datenbanken/datenbanken.component';
import { SqlQueryExecutorComponent } from './tutor-dashboard/sql-query-executor/sql-query-executor.component';
import { WorksheetOverviewComponent } from './tutor-dashboard/worksheet-overview/worksheet-overview.component';
import { WorksheetCreatorComponent } from './tutor-dashboard/worksheet-creator/worksheet-creator.component';
import { StudentDashboardComponent } from './student/student-dashboard/student-dashboard.component';
import { StudentWorksheetComponent } from './student/student-worksheet/student-worksheet.component';
import { TutorSubmissionsComponent } from './tutor-dashboard/tutor-submissions/tutor-submissions.component';
import { SubmissionDetailComponent } from './tutor-dashboard/submission-detail/submission-detail.component';
import { DatabaseCreatorComponent } from './tutor-dashboard/database-creator/database-creator.component';

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
    path: 'overview',
    component: OverviewComponent,
    canActivate: [authGuard]
  },  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [adminGuard],
    children: [
      { path: 'users', component: UserManagementComponent },
      { path: 'settings', component: SettingsManagementComponent },
    ]
  },  { path: 'tutor-dashboard', component: TutorDashboardComponent, 
    canActivate: [tutorGuard],
    children: [
    { path: 'students', component: StudentOverviewComponent },
    { path: 'aufgaben', component: MeineAufgabenComponent },
    { path: 'upload', component: SqlUploadComponent },
    { path: 'create-database', component: DatabaseCreatorComponent },
    { path: 'datenbanken', component: DatenbankenComponent },
    { path: 'query-executor', component: SqlQueryExecutorComponent },    { path: 'worksheets', component: WorksheetOverviewComponent },
    { path: 'worksheets/new', component: WorksheetCreatorComponent },    { path: 'worksheets/edit/:id', component: WorksheetCreatorComponent },
    { path: 'worksheets/preview/:id', component: WorksheetCreatorComponent },
    { path: 'submissions', component: TutorSubmissionsComponent },
    { path: 'submissions/:id', component: SubmissionDetailComponent },
  ] },  {
    path: 'student',
    component: StudentDashboardComponent,
    canActivate: [studentGuard]
  },
  {
    path: 'student/worksheet/:id',
    component: StudentWorksheetComponent,
    canActivate: [studentGuard]
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
];
