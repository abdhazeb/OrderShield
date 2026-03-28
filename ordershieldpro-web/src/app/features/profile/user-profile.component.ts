import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { ReviewCardComponent } from '../../shared/components/review-card/review-card.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { Review, PaginatedResult, UserProfile } from '../../core/models';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [RouterLink, FormsModule, TranslateModule, StatCardComponent, LoadingSpinnerComponent, LanguageSelectorComponent, ReviewCardComponent],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfileComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  authService = inject(AuthService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);

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
    this.confirmService.confirm({ message, color: 'warn' }).subscribe(confirmed => {
      if (confirmed) {
        this.authService.logout();
        this.router.navigate(['/']);
      }
    });
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
      this.toast.warning(this.translate.instant('subscription.fileTooLarge'));
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
