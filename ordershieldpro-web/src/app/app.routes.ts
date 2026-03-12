import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { roleGuard } from './core/auth/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'search',
        loadComponent: () => import('./features/search/search.component').then(m => m.SearchComponent),
      },
      {
        path: 'enquiries',
        loadComponent: () => import('./features/enquiries/enquiries.component').then(m => m.EnquiriesComponent),
      },
      {
        path: 'entity/:id',
        loadComponent: () => import('./features/entity/entity-profile.component').then(m => m.EntityProfileComponent),
      },
      {
        path: 'submit-review',
        canActivate: [authGuard],
        loadComponent: () => import('./features/review/submit-review.component').then(m => m.SubmitReviewComponent),
      },
      {
        path: 'submit-review/:entityId',
        canActivate: [authGuard],
        loadComponent: () => import('./features/review/submit-review.component').then(m => m.SubmitReviewComponent),
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/profile/user-profile.component').then(m => m.UserProfileComponent),
      },
      {
        path: 'notifications',
        canActivate: [authGuard],
        loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent),
      },
      {
        path: 'subscription',
        canActivate: [authGuard],
        loadComponent: () => import('./features/subscription/subscription.component').then(m => m.SubscriptionComponent),
      },
      {
        path: 'admin',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['Admin', 'ServiceTeam', 'SuperAdmin'] },
        loadComponent: () => import('./features/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact-us.component').then(m => m.ContactUsComponent),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./features/legal/legal-page.component').then(m => m.LegalPageComponent),
    data: { type: 'privacy' },
  },
  {
    path: 'terms',
    loadComponent: () => import('./features/legal/legal-page.component').then(m => m.LegalPageComponent),
    data: { type: 'terms' },
  },
  {
    path: '**',
    redirectTo: '',
  },
];
