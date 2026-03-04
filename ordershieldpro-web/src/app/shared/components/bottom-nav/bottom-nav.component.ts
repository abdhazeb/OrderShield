import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <nav class="bottom-nav">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">
        <svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span class="nav-label">{{ 'nav.home' | translate }}</span>
      </a>
      <a routerLink="/search" routerLinkActive="active" class="nav-item">
        <svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span class="nav-label">{{ 'nav.search' | translate }}</span>
      </a>
      <a routerLink="/submit-review" routerLinkActive="active" class="nav-item">
        <svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <span class="nav-label">{{ 'nav.submit' | translate }}</span>
      </a>
      <a routerLink="/profile" routerLinkActive="active" class="nav-item">
        <svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span class="nav-label">{{ 'nav.profile' | translate }}</span>
      </a>
    </nav>
  `,
  styles: [`
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--surface-0);
      display: flex;
      border-top: 1px solid var(--surface-border);
      z-index: 1000;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    .nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px 0 6px;
      text-decoration: none;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 600;
      transition: color var(--transition-fast);
      gap: 3px;
    }

    .nav-icon {
      transition: transform var(--transition-fast);
    }

    .nav-label {
      font-size: 10px;
      letter-spacing: 0.02em;
    }

    .nav-item.active {
      color: var(--accent-600);
    }

    .nav-item.active .nav-icon {
      transform: scale(1.1);
    }

    @media (min-width: 768px) {
      .bottom-nav {
        display: none;
      }
    }
  `]
})
export class BottomNavComponent {
  authService = inject(AuthService);
}
