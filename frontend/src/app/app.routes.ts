import { Routes } from '@angular/router';
import { LandingPage } from './components/landing-page/landing-page';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { Dashboard } from './components/dashboard/dashboard';
import { CourseDetail } from './components/course-detail/course-detail';
import { SessionDetail } from './components/session-detail/session-detail';
import { AssetManagement } from './components/asset-management/asset-management';
import { StudentDiaryComponent } from './components/student-diary/student-diary';
import { DiaryDetail } from './components/student-diary/diary-detail';
import { StudentProgressComponent } from './components/student-progress/student-progress';
import { TemplateLibrary } from './components/template-library/template-library';
import { ProfilePage } from './components/profile-page/profile-page';
import { LeaderboardComponent } from './components/leaderboard/leaderboard';
import { AchievementListComponent } from './components/achievement-list/achievement-list.component';
import { ParentStudentManager } from './components/parent-student-manager/parent-student-manager';
import { UserManagementComponent } from './components/user-management/user-management';
import { ClassManagementComponent } from './components/class-management/class-management';
import { NotFoundComponent } from './components/not-found/not-found';
import { authGuard } from './guards/auth-guard';
import { guestGuard } from './guards/guest-guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingPage,
    title: 'AsoBoard - Fun Learning',
  },
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
    title: 'Login - AsoBoard',
  },
  {
    path: 'register',
    component: Register,
    canActivate: [guestGuard],
    title: 'Register - AsoBoard',
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
    title: 'Dashboard - AsoBoard',
  },
  {
    path: 'course/:id',
    component: CourseDetail,
    canActivate: [authGuard],
    title: 'Course Detail - AsoBoard',
  },
  {
    path: 'session/:id',
    component: SessionDetail,
    canActivate: [authGuard],
    title: 'Session Detail - AsoBoard',
  },
  {
    path: 'assets',
    component: AssetManagement,
    canActivate: [authGuard],
    title: 'Manage Assets - AsoBoard',
  },
  {
    path: 'diaries',
    component: StudentDiaryComponent,
    canActivate: [authGuard],
    title: 'My Sketchbook - AsoBoard',
  },
  {
    path: 'diary/:id',
    component: DiaryDetail,
    canActivate: [authGuard],
    title: 'Magic Sketch - AsoBoard',
  },
  {
    path: 'progress',
    component: StudentProgressComponent,
    canActivate: [authGuard],
    title: 'My Progress - AsoBoard',
  },
  {
    path: 'templates',
    component: TemplateLibrary,
    canActivate: [authGuard],
    title: 'Template Library - AsoBoard',
  },
  {
    path: 'profile',
    component: ProfilePage,
    canActivate: [authGuard],
    title: 'My Profile - AsoBoard',
  },
  {
    path: 'leaderboard',
    component: LeaderboardComponent,
    canActivate: [authGuard],
    title: 'Leaderboard - AsoBoard',
  },
  {
    path: 'achievements',
    component: AchievementListComponent,
    canActivate: [authGuard],
    title: 'Achievements - AsoBoard',
  },
  {
    path: 'manage-links',
    component: ParentStudentManager,
    canActivate: [authGuard],
    title: 'Manage Family Links - AsoBoard',
  },
  {
    path: 'manage-users',
    component: UserManagementComponent,
    canActivate: [authGuard],
    title: 'User Management - AsoBoard',
  },
  {
    path: 'manage-classes',
    component: ClassManagementComponent,
    canActivate: [authGuard],
    title: 'Class Management - AsoBoard',
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Page Not Found - AsoBoard',
  },
];
