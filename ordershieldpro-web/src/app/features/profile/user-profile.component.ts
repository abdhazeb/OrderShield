import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';

interface UserProfile {
  fullName: string;
  email: string;
  region: string;
  languagePreference: string;
  subscriptionTier: number;
  subscriptionExpiryDate: string;
  trustScore: number;
  reviewCount: number;
  watchlistCount: number;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [RouterLink, TranslateModule, StatCardComponent, LoadingSpinnerComponent, LanguageSelectorComponent],
  template: `
    @if (!authService.isAuthenticated()) {
      <!-- Logged Out View -->
      <div class="logged-out">
        <div class="lock-icon">🔒</div>
        <h2>{{ 'auth.login' | translate }}</h2>
        <p class="subtitle">Sign in to access your profile and manage your watchlist</p>

        <div class="auth-buttons">
          <a routerLink="/login" class="btn btn-primary">{{ 'auth.loginButton' | translate }}</a>
          <a routerLink="/register" class="btn btn-outline">{{ 'auth.registerButton' | translate }}</a>
        </div>

        <!-- Subscription Plans -->
        <div class="plans-section">
          <h3>{{ 'profile.subscription' | translate }}</h3>
          <div class="plan-cards">
            <div class="plan-card">
              <div class="plan-name">Free</div>
              <div class="plan-price">&#36;0</div>
              <ul>
                <li>5 searches/day</li>
                <li>View public reviews</li>
                <li>Submit reviews</li>
              </ul>
            </div>
            <div class="plan-card popular">
              <div class="plan-badge">Popular</div>
              <div class="plan-name">Pro</div>
              <div class="plan-price">&#36;29<span>/mo</span></div>
              <ul>
                <li>Unlimited searches</li>
                <li>Watch entity alerts</li>
                <li>Priority verification</li>
                <li>API access</li>
              </ul>
            </div>
            <div class="plan-card">
              <div class="plan-name">Enterprise</div>
              <div class="plan-price">Custom</div>
              <ul>
                <li>All Pro features</li>
                <li>Custom integrations</li>
                <li>Dedicated support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    } @else {
      <!-- Logged In View -->
      @if (loading()) {
        <app-loading-spinner />
      } @else if (profileError()) {
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h2>Could not load profile</h2>
          <p class="subtitle">{{ profileError() }}</p>
          <button class="btn btn-primary" (click)="loadProfile()">Try Again</button>
        </div>
      } @else if (profile()) {
        <div class="profile-page">
          <!-- User Info -->
          <div class="user-card">
            <div class="user-avatar">{{ getInitials() }}</div>
            <h2 class="user-name">{{ profile()!.fullName }}</h2>
            <p class="user-email">{{ profile()!.email }}</p>
          </div>

          <!-- Stats -->
          <div class="stats-row">
            <app-stat-card [value]="profile()!.reviewCount" [label]="'profile.myReviews' | translate" />
            <app-stat-card [value]="profile()!.watchlistCount" [label]="'profile.watchlist' | translate" />
            <app-stat-card [value]="profile()!.trustScore" [label]="'profile.trustScore' | translate" />
          </div>

          <!-- Activity -->
          <div class="section">
            <a routerLink="/search" class="menu-item">
              <span>📝 {{ 'profile.myReviews' | translate }}</span>
              <span class="arrow">→</span>
            </a>
            <a routerLink="/search" class="menu-item">
              <span>👁️ {{ 'profile.watchlist' | translate }}</span>
              <span class="arrow">→</span>
            </a>
            <a routerLink="/notifications" class="menu-item">
              <span>🔔 {{ 'notification.title' | translate }}</span>
              <span class="arrow">→</span>
            </a>
          </div>

          <!-- Subscription -->
          <div class="section">
            <div class="section-title">{{ 'profile.subscription' | translate }}</div>
            <div class="current-plan">
              <div class="plan-info">
                <span class="plan-tier">{{ getTierName() }}</span>
                <span class="plan-label">{{ 'profile.currentPlan' | translate }}</span>
              </div>
              <button class="btn btn-sm btn-outline">{{ 'profile.changePlan' | translate }}</button>
            </div>
          </div>

          <!-- Settings -->
          <div class="section">
            <div class="section-title">{{ 'profile.settings' | translate }}</div>
            <div class="menu-item">
              <span>🌐 {{ 'profile.language' | translate }}</span>
              <app-language-selector />
            </div>
            <a routerLink="/privacy" class="menu-item menu-link">
              <span>🔒 {{ 'profile.privacySecurity' | translate }}</span>
              <span class="arrow">→</span>
            </a>
            <a routerLink="/terms" class="menu-item menu-link">
              <span>📋 {{ 'legal.termsTitle' | translate }}</span>
              <span class="arrow">→</span>
            </a>
            <a routerLink="/contact" class="menu-item menu-link">
              <span>📩 {{ 'contact.title' | translate }}</span>
              <span class="arrow">→</span>
            </a>
          </div>

          <!-- Logout -->
          <button class="btn btn-danger" (click)="logout()">
            {{ 'nav.logout' | translate }}
          </button>
        </div>
      }
    }
  `,
  styles: [`
    /* Logged Out View */
    .logged-out { text-align: center; padding: 32px 16px; }
    .lock-icon { font-size: 48px; margin-bottom: 12px; }
    .logged-out h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; font-family: var(--font-display); }
    .subtitle { color: var(--text-tertiary); font-size: 14px; margin-bottom: 24px; }

    .auth-buttons { display: flex; gap: 12px; margin-bottom: 32px; }

    .plans-section h3 { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: var(--text-primary); font-family: var(--font-display); }
    .plan-cards { display: grid; grid-template-columns: 1fr; gap: 12px; }
    .plan-card {
      background: var(--surface-0); border-radius: var(--radius-lg); padding: 20px; text-align: center;
      box-shadow: var(--shadow-sm); transition: all var(--transition-base); border: 2px solid var(--surface-border); position: relative;
    }
    .plan-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .plan-card.popular { border-color: var(--accent-600); }
    .plan-badge {
      position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
      background: var(--accent-600); color: white; padding: 2px 12px; border-radius: var(--radius-full);
      font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
    }
    .plan-name { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; font-family: var(--font-display); }
    .plan-price { font-size: 28px; font-weight: 800; color: var(--navy-900); margin-bottom: 12px; font-family: var(--font-display); }
    .plan-price span { font-size: 14px; color: var(--text-tertiary); font-weight: 500; }
    .plan-card ul { list-style: none; padding: 0; text-align: left; }
    .plan-card li { padding: 4px 0; font-size: 13px; color: var(--text-secondary); }
    .plan-card li::before { content: "✓ "; color: var(--success); font-weight: 700; }

    /* Logged In View */
    .profile-page { padding: 16px; }

    .user-card {
      background: var(--surface-0); border-radius: var(--radius-lg); padding: 24px; text-align: center;
      box-shadow: var(--shadow-sm); border: 1px solid var(--surface-border-subtle); transition: all var(--transition-base); margin-bottom: 16px;
    }
    .user-avatar {
      width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, var(--navy-900), var(--accent-500));
      color: white; font-size: 24px; font-weight: 700; display: flex; align-items: center;
      justify-content: center; margin: 0 auto 12px;
    }
    .user-name { font-size: 20px; font-weight: 700; color: var(--text-primary); font-family: var(--font-display); }
    .user-email { font-size: 14px; color: var(--text-tertiary); margin-top: 4px; }

    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }

    .section {
      background: var(--surface-0); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--surface-border-subtle);
      transition: all var(--transition-base); margin-bottom: 16px;
    }
    .section-title { font-size: 14px; font-weight: 700; color: var(--text-tertiary); padding: 16px 16px 8px; text-transform: uppercase; letter-spacing: 0.5px; }

    .menu-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; border-bottom: 1px solid var(--surface-100); cursor: pointer;
      text-decoration: none; color: var(--text-primary); font-size: 14px; transition: background var(--transition-fast);
    }
    .menu-item:last-child { border-bottom: none; }
    .menu-item:hover { background: var(--surface-50); }
    a.menu-item { text-decoration: none; color: var(--text-primary); }
    .arrow { color: var(--text-muted); font-size: 16px; }

    .current-plan {
      display: flex; justify-content: space-between; align-items: center; padding: 16px;
    }
    .plan-tier { font-size: 16px; font-weight: 700; color: var(--navy-900); font-family: var(--font-display); }
    .plan-label { display: block; font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }

    .btn {
      flex: 1; padding: 12px; border: none; border-radius: var(--radius-md);
      font-weight: 700; font-size: 14px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      text-decoration: none; transition: all var(--transition-fast); width: 100%; font-family: var(--font-body);
    }
    .btn-primary { background: var(--accent-600); color: white; }
    .btn-primary:hover { background: var(--accent-500); }
    .btn-outline { background: var(--surface-0); color: var(--accent-600); border: 2px solid var(--accent-600); }
    .btn-outline:hover { background: var(--accent-50); }
    .btn-sm { padding: 8px 16px; font-size: 12px; flex: unset; width: auto; }
    .btn-danger { background: var(--danger-bg); color: var(--danger); margin-top: 8px; }
    .btn-danger:hover { background: #fecaca; }

    .error-state { text-align: center; padding: 48px 16px; }
    .error-icon { font-size: 48px; margin-bottom: 12px; }
    .error-state h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; font-family: var(--font-display); }
    .error-state .btn { max-width: 200px; margin: 16px auto 0; }

    @media (min-width: 768px) {
      .profile-page { max-width: 600px; margin: 2rem auto; padding: 0; }
      .logged-out { max-width: 700px; margin: 0 auto; }
      .plan-cards { grid-template-columns: repeat(3, 1fr); }
    }
  `]
})
export class UserProfileComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  authService = inject(AuthService);

  profile = signal<UserProfile | null>(null);
  loading = signal(true);
  profileError = signal<string | null>(null);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.loadProfile();
    }
  }

  loadProfile(): void {
    this.loading.set(true);
    this.profileError.set(null);
    this.apiService.get<UserProfile>('userprofile').subscribe({
      next: (data) => {
        this.profile.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.profileError.set(err?.error?.message || err?.message || 'Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  getInitials(): string {
    const name = this.profile()?.fullName || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getTierName(): string {
    switch (this.profile()?.subscriptionTier) {
      case 1: return 'Pro';
      case 2: return 'Enterprise';
      default: return 'Free';
    }
  }

  logout(): void {
    const message = this.translate.instant('nav.logoutConfirm');
    if (confirm(message)) {
      this.authService.logout();
      this.router.navigate(['/']);
    }
  }
}
