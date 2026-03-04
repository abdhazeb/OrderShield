import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslateModule, LanguageSelectorComponent],
  template: `
    <!-- Desktop Header -->
    <header class="desktop-header">
      <div class="header-content">
        <a routerLink="/" class="logo">
          <span class="logo-mark">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2L3 7v7c0 7.18 4.69 13.89 11 15.5C20.31 27.89 25 21.18 25 14V7L14 2z" fill="url(#shieldGrad)" stroke="currentColor" stroke-width="0.5" opacity="0.9"/>
              <path d="M10 14l3 3 5-5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <defs><linearGradient id="shieldGrad" x1="3" y1="2" x2="25" y2="28"><stop stop-color="#0f9197"/><stop offset="1" stop-color="#0d7377"/></linearGradient></defs>
            </svg>
          </span>
          <span class="logo-text">OrderShield<span class="logo-accent">Pro</span></span>
        </a>
        <nav class="desktop-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">{{ 'nav.home' | translate }}</a>
          <a routerLink="/search" routerLinkActive="active">{{ 'nav.search' | translate }}</a>
          @if (authService.isAuthenticated()) {
            <a routerLink="/submit-review" routerLinkActive="active">{{ 'nav.submit' | translate }}</a>
            <a routerLink="/profile" routerLinkActive="active">{{ 'nav.profile' | translate }}</a>
            @if (authService.isAdmin()) {
              <a routerLink="/admin" routerLinkActive="active">{{ 'nav.admin' | translate }}</a>
            }
          }
        </nav>
        <div class="header-actions">
          <app-language-selector />
          @if (authService.isAuthenticated()) {
            <button class="icon-btn notification-btn" routerLink="/notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              @if (notificationService.unreadCount() > 0) {
                <span class="notification-badge">{{ notificationService.unreadCount() }}</span>
              }
            </button>
            <button class="btn-logout" (click)="logout()">{{ 'nav.logout' | translate }}</button>
          } @else {
            <a routerLink="/login" class="btn-login">{{ 'nav.login' | translate }}</a>
            <a routerLink="/register" class="btn-register">{{ 'nav.register' | translate }}</a>
          }
        </div>
      </div>
    </header>

    <!-- Mobile Header -->
    <header class="mobile-header">
      <div class="header-top">
        <a routerLink="/" class="app-title">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2L3 7v7c0 7.18 4.69 13.89 11 15.5C20.31 27.89 25 21.18 25 14V7L14 2z" fill="url(#shieldGradM)" stroke="currentColor" stroke-width="0.5" opacity="0.9"/>
            <path d="M10 14l3 3 5-5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <defs><linearGradient id="shieldGradM" x1="3" y1="2" x2="25" y2="28"><stop stop-color="#0f9197"/><stop offset="1" stop-color="#0d7377"/></linearGradient></defs>
          </svg>
          <span>OrderShield<span class="logo-accent">Pro</span></span>
        </a>
        <div class="header-right">
          <app-language-selector />
          @if (authService.isAuthenticated()) {
            <button class="icon-btn" routerLink="/notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              @if (notificationService.unreadCount() > 0) {
                <span class="notification-badge">{{ notificationService.unreadCount() }}</span>
              }
            </button>
          } @else {
            <a routerLink="/login" class="icon-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </a>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    /* ===== Desktop Header ===== */
    .desktop-header {
      display: none;
      background: var(--surface-0);
      border-bottom: 1px solid var(--surface-border);
      padding: 0;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(12px);
      background: rgba(255, 255, 255, 0.92);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 64px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      text-decoration: none;
      color: var(--navy-900);
    }

    .logo-mark {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-500);
    }

    .logo-text {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--navy-900);
    }

    .logo-accent {
      color: var(--accent-600);
    }

    .desktop-nav {
      display: flex;
      gap: 0.25rem;
    }

    .desktop-nav a {
      color: var(--text-secondary);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      transition: color var(--transition-fast), background var(--transition-fast);
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-md);
      position: relative;
    }

    .desktop-nav a:hover {
      color: var(--navy-900);
      background: var(--navy-50);
    }

    .desktop-nav a.active {
      color: var(--accent-600);
      background: var(--accent-50);
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-login {
      color: var(--text-secondary);
      text-decoration: none;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
    }

    .btn-login:hover {
      background: var(--navy-50);
      color: var(--navy-900);
    }

    .btn-register {
      background: var(--navy-900);
      color: var(--text-on-dark);
      text-decoration: none;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0.5rem 1.25rem;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      box-shadow: var(--shadow-sm);
    }

    .btn-register:hover {
      background: var(--navy-800);
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    .btn-logout {
      background: transparent;
      color: var(--text-secondary);
      border: 1.5px solid var(--surface-border);
      padding: 0.4rem 1rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      font-family: var(--font-body);
      transition: all var(--transition-fast);
    }

    .btn-logout:hover {
      background: var(--navy-50);
      border-color: var(--navy-200);
      color: var(--navy-900);
    }

    /* ===== Mobile Header ===== */
    .mobile-header {
      display: block;
      background: var(--navy-900);
      color: var(--text-on-dark);
      padding: 14px 16px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .app-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: -0.02em;
      color: var(--text-on-dark);
      text-decoration: none;
    }

    .app-title .logo-accent {
      color: var(--accent-300);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .icon-btn {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: var(--text-on-dark);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      text-decoration: none;
      position: relative;
      transition: background var(--transition-fast);
    }

    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    /* Desktop icon buttons */
    .desktop-header .icon-btn {
      color: var(--text-secondary);
      background: transparent;
      border: 1.5px solid var(--surface-border);
    }

    .desktop-header .icon-btn:hover {
      background: var(--navy-50);
      color: var(--navy-900);
      border-color: var(--navy-200);
    }

    .notification-btn {
      position: relative;
    }

    .notification-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      background: var(--severity-critical);
      color: white;
      font-size: 10px;
      font-weight: 700;
      min-width: 17px;
      height: 17px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border: 2px solid var(--surface-0);
    }

    .mobile-header .notification-badge {
      border-color: var(--navy-900);
    }

    @media (min-width: 768px) {
      .desktop-header { display: block; }
      .mobile-header { display: none; }
    }
  `]
})
export class HeaderComponent {
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  logout(): void {
    const message = this.translate.instant('nav.logoutConfirm');
    if (confirm(message)) {
      this.authService.logout();
      this.router.navigate(['/']);
    }
  }
}
