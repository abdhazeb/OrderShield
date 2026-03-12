import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { ReviewCardComponent } from '../../shared/components/review-card/review-card.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { Review, PaginatedResult } from '../../core/models';

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
  phoneNumber?: string;
  businessName?: string;
  licenseAddress?: string;
  businessPhone?: string;
  businessLicenseFilePath?: string;
  isBusinessVerified?: boolean;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [RouterLink, FormsModule, TranslateModule, StatCardComponent, LoadingSpinnerComponent, LanguageSelectorComponent, ReviewCardComponent],
  template: `
    @if (!authService.isAuthenticated()) {
      <!-- Logged Out View -->
      <div class="logged-out">
        <div class="lock-icon">🔒</div>
        <h2>{{ 'auth.login' | translate }}</h2>
        <p class="subtitle">{{ 'profile.loginPrompt' | translate }}</p>

        <div class="auth-buttons">
          <a routerLink="/login" class="btn btn-primary">{{ 'auth.loginButton' | translate }}</a>
          <a routerLink="/register" class="btn btn-outline">{{ 'auth.registerButton' | translate }}</a>
        </div>

        <!-- Subscription Plans -->
        <div class="plans-section">
          <h3>{{ 'profile.subscription' | translate }}</h3>
          <div class="plan-cards">
            <div class="plan-card">
              <div class="plan-name">{{ 'subscription.free' | translate }}</div>
              <div class="plan-price">&#36;0</div>
              <ul>
                <li>{{ 'subscription.freeFeature1' | translate }}</li>
                <li>{{ 'subscription.freeFeature2' | translate }}</li>
                <li>{{ 'subscription.freeFeature3' | translate }}</li>
              </ul>
            </div>
            <div class="plan-card popular">
              <div class="plan-badge">{{ 'subscription.popular' | translate }}</div>
              <div class="plan-name">{{ 'subscription.pro' | translate }}</div>
              <div class="plan-price">&#36;99<span>{{ 'subscription.perYear' | translate }}</span></div>
              <ul>
                <li>{{ 'subscription.proFeature1' | translate }}</li>
                <li>{{ 'subscription.proFeature2' | translate }}</li>
                <li>{{ 'subscription.proFeature3' | translate }}</li>
                <li>{{ 'subscription.proFeature4' | translate }}</li>
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
          <h2>{{ 'profile.errorLoading' | translate }}</h2>
          <p class="subtitle">{{ profileError() }}</p>
          <button class="btn btn-primary" (click)="loadProfile()">{{ 'profile.tryAgain' | translate }}</button>
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
            <div class="stat-clickable" (click)="showMyReviews()">
              <app-stat-card [value]="profile()!.reviewCount" [label]="'profile.myReviews' | translate" />
            </div>
            <app-stat-card [value]="profile()!.watchlistCount" [label]="'profile.watchlist' | translate" />
            <app-stat-card [value]="profile()!.trustScore" [label]="'profile.trustScore' | translate" />
          </div>

          <!-- My Reviews Section -->
          @if (showingMyReviews()) {
            <div class="section my-reviews-section">
              <div class="section-title my-reviews-header">
                <span>{{ 'profile.myReviews' | translate }}</span>
                <button class="btn-close-reviews" (click)="showingMyReviews.set(false)">✕</button>
              </div>
              @if (myReviewsLoading()) {
                <div class="reviews-loading">
                  <app-loading-spinner />
                </div>
              } @else if (myReviews().length === 0) {
                <div class="reviews-empty">
                  <p>{{ 'review.noReviews' | translate }}</p>
                </div>
              } @else {
                <div class="reviews-list">
                  @for (review of myReviews(); track review.id) {
                    <app-review-card [review]="review" />
                  }
                </div>
              }
            </div>
          }

          <!-- Business Verification -->
          <div class="section verification-section">
            <div class="section-title">
              {{ 'profile.businessVerification' | translate }}
              @if (profile()?.isBusinessVerified) {
                <span class="verified-badge">✓ {{ 'profile.verified' | translate }}</span>
              } @else {
                <span class="unverified-badge">{{ 'profile.unverified' | translate }}</span>
              }
            </div>
            <div class="verification-form">
              <div class="form-group-inline">
                <label>{{ 'profile.businessName' | translate }}</label>
                <input class="form-input-sm" type="text" [(ngModel)]="businessName" [placeholder]="'profile.businessNameHint' | translate" />
              </div>
              <div class="form-group-inline">
                <label>{{ 'profile.licenseAddress' | translate }}</label>
                <input class="form-input-sm" type="text" [(ngModel)]="licenseAddress" [placeholder]="'profile.licenseAddressHint' | translate" />
              </div>
              <div class="form-group-inline">
                <label>{{ 'profile.businessPhone' | translate }}</label>
                <input class="form-input-sm" type="tel" [(ngModel)]="businessPhone" [placeholder]="'profile.businessPhoneHint' | translate" />
              </div>
              <div class="form-group-inline">
                <label>{{ 'profile.businessLicense' | translate }}</label>
                @if (profile()?.businessLicenseFilePath) {
                  <div class="license-uploaded">
                    <span class="license-icon">📄</span>
                    <span>{{ 'profile.licenseUploaded' | translate }}</span>
                    <button class="btn-reupload" (click)="licenseInput.click()">{{ 'profile.reupload' | translate }}</button>
                  </div>
                } @else {
                  <button class="btn-upload-license" (click)="licenseInput.click()">
                    📤 {{ 'profile.uploadLicense' | translate }}
                  </button>
                }
                <input #licenseInput type="file" accept=".jpg,.jpeg,.png,.pdf,.webp" (change)="onLicenseSelected($event)" style="display:none" />
              </div>
              @if (verificationSaving()) {
                <div class="saving-indicator">{{ 'common.loading' | translate }}</div>
              }
              <button class="btn btn-sm btn-primary verification-save-btn" (click)="saveVerification()" [disabled]="verificationSaving()">
                {{ 'common.save' | translate }}
              </button>
            </div>
          </div>

          <!-- Activity -->
          <div class="section">
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
                @if (getRemainingDays() > 0) {
                  <span class="plan-remaining">{{ getRemainingDays() }} {{ 'profile.daysRemaining' | translate }}</span>
                } @else if (profile()?.subscriptionExpiryDate) {
                  <span class="plan-expired">{{ 'profile.expired' | translate }}</span>
                }
              </div>
              <button class="btn btn-sm btn-outline" (click)="goToSubscription()">{{ 'profile.changePlan' | translate }}</button>
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
    .stat-clickable { cursor: pointer; transition: transform var(--transition-fast); }
    .stat-clickable:hover { transform: translateY(-2px); }

    /* My Reviews Section */
    .my-reviews-section { margin-bottom: 16px; }
    .my-reviews-header { display: flex; justify-content: space-between; align-items: center; }
    .btn-close-reviews {
      background: none; border: none; font-size: 16px; color: var(--text-tertiary); cursor: pointer;
      padding: 4px 8px; border-radius: var(--radius-sm); transition: all var(--transition-fast); font-family: var(--font-body);
    }
    .btn-close-reviews:hover { background: var(--surface-100); color: var(--text-primary); }
    .reviews-loading { padding: 24px; text-align: center; }
    .reviews-empty { padding: 24px 16px; text-align: center; color: var(--text-tertiary); font-size: 14px; }
    .reviews-list { padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 12px; }

    /* Business Verification */
    .verification-section .section-title { display: flex; align-items: center; gap: 8px; }
    .verified-badge {
      font-size: 11px; font-weight: 700; color: var(--success); background: var(--success-bg);
      padding: 2px 8px; border-radius: var(--radius-full); text-transform: none; letter-spacing: 0;
    }
    .unverified-badge {
      font-size: 11px; font-weight: 700; color: var(--severity-warning); background: var(--severity-warning-bg);
      padding: 2px 8px; border-radius: var(--radius-full); text-transform: none; letter-spacing: 0;
    }
    .verification-form { padding: 12px 16px 16px; }
    .form-group-inline { margin-bottom: 12px; }
    .form-group-inline label {
      display: block; font-size: 12px; font-weight: 700; color: var(--text-tertiary);
      margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em;
    }
    .form-input-sm {
      width: 100%; padding: 10px 12px; border: 1.5px solid var(--surface-border);
      border-radius: var(--radius-md); font-size: 14px; font-family: var(--font-body);
      box-sizing: border-box; color: var(--text-primary); background: var(--surface-0);
      transition: border-color var(--transition-fast);
    }
    .form-input-sm:focus { outline: none; border-color: var(--accent-400); }
    .license-uploaded {
      display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--success); font-weight: 600;
    }
    .license-icon { font-size: 18px; }
    .btn-reupload {
      background: none; border: none; color: var(--accent-600); font-size: 12px; font-weight: 700;
      cursor: pointer; text-decoration: underline; font-family: var(--font-body);
    }
    .btn-upload-license {
      padding: 10px 16px; border: 2px dashed var(--surface-border); border-radius: var(--radius-md);
      background: var(--surface-50); color: var(--text-secondary); font-size: 13px; font-weight: 600;
      cursor: pointer; width: 100%; text-align: center; font-family: var(--font-body);
      transition: all var(--transition-fast);
    }
    .btn-upload-license:hover { border-color: var(--accent-400); background: var(--accent-50); }
    .verification-save-btn { margin-top: 8px; }
    .saving-indicator { font-size: 12px; color: var(--text-tertiary); margin-bottom: 8px; }

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
    .plan-remaining { display: block; font-size: 12px; color: var(--success); font-weight: 600; margin-top: 2px; }
    .plan-expired { display: block; font-size: 12px; color: var(--danger); font-weight: 600; margin-top: 2px; }

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
      .profile-page { max-width: 960px; margin: 2rem auto; padding: 0; }
      .logged-out { max-width: 960px; margin: 0 auto; }
      .plan-cards { grid-template-columns: repeat(3, 1fr); }
    }

    /* ===== RTL overrides ===== */
    :host-context([dir="rtl"]) .plan-card ul {
      text-align: right;
    }
    :host-context([dir="rtl"]) .form-group-inline label,
    :host-context([dir="rtl"]) .form-input-sm {
      text-align: right;
      direction: rtl;
    }
    :host-context([dir="rtl"]) .plan-info {
      text-align: right;
    }
    :host-context([dir="rtl"]) .section-title {
      text-align: right;
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
  verificationSaving = signal(false);

  // My Reviews
  myReviews = signal<Review[]>([]);
  myReviewsLoading = signal(false);
  showingMyReviews = signal(false);

  // Business verification fields
  businessName = '';
  licenseAddress = '';
  businessPhone = '';

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
        this.businessName = data.businessName || '';
        this.licenseAddress = data.licenseAddress || '';
        this.businessPhone = data.businessPhone || '';
        this.loading.set(false);
      },
      error: (err) => {
        this.profileError.set(err?.error?.message || err?.message || this.translate.instant('profile.errorGeneric'));
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
      default: return 'Free';
    }
  }

  getRemainingDays(): number {
    const expiry = this.profile()?.subscriptionExpiryDate;
    if (!expiry) return 0;
    const diff = new Date(expiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  goToSubscription(): void {
    this.router.navigate(['/subscription']);
  }

  logout(): void {
    const message = this.translate.instant('nav.logoutConfirm');
    if (confirm(message)) {
      this.authService.logout();
      this.router.navigate(['/']);
    }
  }

  showMyReviews(): void {
    if (this.showingMyReviews()) {
      this.showingMyReviews.set(false);
      return;
    }
    this.showingMyReviews.set(true);
    this.myReviewsLoading.set(true);
    this.apiService.get<PaginatedResult<Review>>('reviews/my?pageSize=50').subscribe({
      next: (res) => {
        this.myReviews.set(res.items);
        this.myReviewsLoading.set(false);
      },
      error: () => {
        this.myReviews.set([]);
        this.myReviewsLoading.set(false);
      },
    });
  }

  saveVerification(): void {
    const p = this.profile();
    if (!p) return;
    this.verificationSaving.set(true);
    this.apiService.put('userprofile', {
      fullName: p.fullName,
      region: p.region,
      businessName: this.businessName || null,
      licenseAddress: this.licenseAddress || null,
      businessPhone: this.businessPhone || null,
    }).subscribe({
      next: () => {
        this.verificationSaving.set(false);
        this.loadProfile();
      },
      error: () => this.verificationSaving.set(false),
    });
  }

  onLicenseSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.size > 10 * 1024 * 1024) {
      alert(this.translate.instant('subscription.fileTooLarge'));
      return;
    }
    this.verificationSaving.set(true);
    const fd = new FormData();
    fd.append('file', file, file.name);
    this.apiService.upload<{ filePath: string }>('userprofile/business-license', fd).subscribe({
      next: () => {
        this.verificationSaving.set(false);
        this.loadProfile();
      },
      error: () => this.verificationSaving.set(false),
    });
  }
}
