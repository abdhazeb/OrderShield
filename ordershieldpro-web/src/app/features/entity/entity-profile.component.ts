import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ReviewCardComponent } from '../../shared/components/review-card/review-card.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { EntityDetail, Review, PaginatedResult } from '../../core/models';
import { VerificationStatus } from '../../core/enums';

@Component({
  selector: 'app-entity-profile',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    TranslateModule,
    ReviewCardComponent,
    StatCardComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    @if (loading()) {
      <app-loading-spinner />
    } @else if (entity()) {
      <div class="entity-profile">
        <!-- Profile Header -->
        <div class="profile-header">
          <div class="profile-name-row">
            <div>
              <h1 class="profile-name">{{ entity()!.legalName }}</h1>
              @if (entity()!.tradeName && entity()!.tradeName !== entity()!.legalName) {
                <div class="trade-name">{{ entity()!.tradeName }}</div>
              }
            </div>
          </div>

          <div class="profile-badges">
            @if (isVerified()) {
              <span class="badge badge-verified">✓ {{ 'verification.verified' | translate }}</span>
            } @else {
              <span class="badge badge-unverified">{{ 'verification.unverified' | translate }}</span>
            }
          </div>

          <div class="profile-meta">
            @if (entity()!.country) {
              <span class="meta-item">📍 {{ entity()!.country }}{{ entity()!.region ? ', ' + entity()!.region : '' }}{{ entity()!.city ? ', ' + entity()!.city : '' }}</span>
            }
            @if (entity()!.productCategories) {
              <span class="meta-item">📦 {{ entity()!.productCategories }}</span>
            }
            <span class="meta-item">📅 {{ 'entity.listedSince' | translate }}: {{ entity()!.listedDate | date:'mediumDate' }}</span>
          </div>

          <div class="profile-actions">
            <button class="btn btn-primary" [routerLink]="['/submit-review', entity()!.id]">
              ✍️ {{ 'review.submit' | translate }}
            </button>
            @if (authService.isAuthenticated() && entity()!.totalReviewCount > 0) {
              <button class="btn btn-outline" [routerLink]="['/submit-review', entity()!.id]" [queryParams]="{ mode: 'comment' }">
                💬 {{ 'review.addComment' | translate }}
              </button>
            }
          </div>
        </div>

        <!-- Stats -->
        <div class="profile-stats">
          <app-stat-card [value]="entity()!.totalReviewCount" [label]="'entity.stats.total' | translate" />
          <app-stat-card [value]="entity()!.infoReviewCount" [label]="'entity.stats.info' | translate" color="#1e40af" />
          <app-stat-card [value]="entity()!.warningReviewCount" [label]="'entity.stats.warning' | translate" color="#92400e" />
          <app-stat-card [value]="entity()!.criticalReviewCount" [label]="'entity.stats.critical' | translate" color="#991b1b" />
        </div>

        <!-- Additional Info -->
        @if (entity()!.phoneNumbers.length > 0 || entity()!.weChatIds.length > 0 || entity()!.historicalNames.length > 0) {
          <div class="info-section">
            @if (entity()!.phoneNumbers.length > 0) {
              <div class="info-group">
                <h3>📞 {{ 'entity.phoneNumbers' | translate }}</h3>
                @for (phone of entity()!.phoneNumbers; track phone.id) {
                  <span class="info-tag">{{ phone.phoneNumber }}</span>
                }
              </div>
            }
            @if (entity()!.weChatIds.length > 0) {
              <div class="info-group">
                <h3>💬 {{ 'entity.weChatIds' | translate }}</h3>
                @for (wechat of entity()!.weChatIds; track wechat.id) {
                  <span class="info-tag">{{ wechat.weChatId }}</span>
                }
              </div>
            }
            @if (entity()!.historicalNames.length > 0) {
              <div class="info-group">
                <h3>📜 {{ 'entity.historicalNames' | translate }}</h3>
                @for (name of entity()!.historicalNames; track name.id) {
                  <span class="info-tag">{{ name.previousName }}</span>
                }
              </div>
            }
          </div>
        }

        <!-- Followers -->
        <div class="followers-count">
          👥 {{ entity()!.followerCount }} {{ 'entity.followers' | translate }}
        </div>

        <!-- Review Timeline -->
        <div class="section">
          <div class="section-title">
            {{ 'entity.timeline' | translate }}
          </div>

          @if (reviewsLoading()) {
            <app-loading-spinner />
          } @else {
            @for (review of reviews(); track review.id) {
              <app-review-card [review]="review" />
            } @empty {
              <div class="empty-message">{{ 'common.noData' | translate }}</div>
            }
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .entity-profile { padding: 0; }

    .profile-header {
      background: var(--surface-0);
      padding: 20px 16px;
      box-shadow: var(--shadow-sm); border-bottom: 1px solid var(--surface-border-subtle);
      margin-bottom: 16px;
    }

    .profile-name-row {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 12px;
    }

    .profile-name {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.3;
      font-family: var(--font-display);
    }

    .trade-name { font-size: 14px; color: var(--text-tertiary); margin-top: 2px; }

    .type-badge {
      background: var(--accent-100); color: var(--navy-800); padding: 4px 10px; border-radius: var(--radius-full);
      font-size: 11px; font-weight: 700; text-transform: uppercase; white-space: nowrap; letter-spacing: 0.02em;
    }

    .profile-badges { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }

    .badge {
      padding: 4px 10px; border-radius: var(--radius-full); font-size: 12px; font-weight: 700;
      display: inline-flex; align-items: center; gap: 4px;
    }

    .badge-verified { background: var(--success-bg); color: var(--success); }
    .badge-unverified { background: var(--surface-100); color: var(--text-tertiary); }

    .profile-meta {
      display: flex; flex-direction: column; gap: 6px;
      margin-bottom: 16px; font-size: 13px; color: var(--text-tertiary);
    }

    .meta-item { display: flex; align-items: center; gap: 6px; }

    .profile-actions { display: flex; gap: 8px; }

    .btn {
      flex: 1; padding: 12px; border: none; border-radius: var(--radius-md);
      font-weight: 700; font-size: 14px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      text-decoration: none; transition: all var(--transition-fast); font-family: var(--font-body);
    }

    .btn-primary { background: var(--accent-600); color: white; }
    .btn-primary:hover { background: var(--accent-500); }
    .btn-outline {
      background: var(--surface-0); color: var(--accent-600); border: 2px solid var(--accent-600);
    }
    .btn-outline:hover { background: var(--accent-50); }

    .profile-stats {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 8px; padding: 0 16px; margin-bottom: 16px;
    }

    .info-section {
      background: var(--surface-0); border-radius: var(--radius-lg); padding: 16px;
      margin: 0 16px 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--surface-border-subtle);
      transition: all var(--transition-base);
    }

    .info-group { margin-bottom: 12px; }
    .info-group:last-child { margin-bottom: 0; }
    .info-group h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }

    .info-tag {
      display: inline-block; background: var(--surface-100); color: var(--text-secondary);
      padding: 4px 10px; border-radius: var(--radius-sm); font-size: 13px;
      margin: 0 4px 4px 0;
    }
    :host-context([dir="rtl"]) .info-tag {
      margin: 0 0 4px 4px;
    }

    .followers-count {
      padding: 0 16px; margin-bottom: 16px;
      font-size: 14px; color: var(--text-tertiary); font-weight: 500;
    }

    .section { padding: 0 16px 16px; }
    .section-title {
      font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;
      font-family: var(--font-display);
    }

    .empty-message { text-align: center; padding: 2rem; color: var(--text-muted); }

    @media (min-width: 768px) {
      .profile-header { border-radius: var(--radius-lg); padding: 2rem; margin: 0 0 1.5rem; }
      .profile-name { font-size: 1.5rem; color: var(--navy-900); }
      .profile-stats { padding: 0; margin-bottom: 1.5rem; }
      .info-section { margin: 0 0 1.5rem; }
      .followers-count { padding: 0; }
      .section { padding: 0 0 2rem; }
      .profile-meta { flex-direction: row; flex-wrap: wrap; gap: 1.5rem; }
    }

    /* ===== RTL overrides ===== */
    :host-context([dir="rtl"]) .profile-name-row {
      flex-direction: row-reverse;
    }
    :host-context([dir="rtl"]) .profile-badges {
      flex-direction: row-reverse;
    }
    :host-context([dir="rtl"]) .badge {
      flex-direction: row-reverse;
    }
    :host-context([dir="rtl"]) .meta-item {
      flex-direction: row-reverse;
    }
    :host-context([dir="rtl"]) .profile-actions {
      flex-direction: row-reverse;
    }
    :host-context([dir="rtl"]) .info-group h3,
    :host-context([dir="rtl"]) .info-section,
    :host-context([dir="rtl"]) .section-title,
    :host-context([dir="rtl"]) .followers-count {
      text-align: right;
    }
    :host-context([dir="rtl"]) .profile-name,
    :host-context([dir="rtl"]) .trade-name {
      text-align: right;
    }
    @media (min-width: 768px) {
      :host-context([dir="rtl"]) .profile-meta {
        flex-direction: row-reverse;
      }
    }
  `]
})
export class EntityProfileComponent implements OnInit {
  private apiService = inject(ApiService);
  private route = inject(ActivatedRoute);
  authService = inject(AuthService);

  entity = signal<EntityDetail | null>(null);
  reviews = signal<Review[]>([]);
  loading = signal(true);
  reviewsLoading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadEntity(id);
      this.loadReviews(id);
    }
  }

  get isVerified(): () => boolean {
    return () => this.entity()?.verificationStatus === VerificationStatus.Verified;
  }

  private loadEntity(id: string): void {
    this.apiService.get<EntityDetail>(`entities/${id}`).subscribe({
      next: (entity) => {
        this.entity.set(entity);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadReviews(entityId: string): void {
    this.apiService
      .get<PaginatedResult<Review>>(`reviews?entityId=${entityId}&page=1&pageSize=20`)
      .subscribe({
        next: (result) => {
          this.reviews.set(result.items);
          this.reviewsLoading.set(false);
        },
        error: () => this.reviewsLoading.set(false),
      });
  }

  toggleFollow(): void {
    const e = this.entity();
    if (!e) return;

    if (e.isFollowed) {
      this.apiService.delete(`entities/${e.id}/follow`).subscribe({
        next: () => {
          this.entity.set({ ...e, isFollowed: false, followerCount: e.followerCount - 1 });
        },
      });
    } else {
      this.apiService.post(`entities/${e.id}/follow`, {}).subscribe({
        next: () => {
          this.entity.set({ ...e, isFollowed: true, followerCount: e.followerCount + 1 });
        },
      });
    }
  }
}
