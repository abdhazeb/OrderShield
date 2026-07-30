import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReviewCardComponent } from '../../shared/components/review-card/review-card.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { EntityDetail, Review, PaginatedResult } from '../../core/models';
import { EntityType, ReviewStatus, SeverityLevel, VerificationStatus } from '../../core/enums';
import { LocalizeValuePipe } from '../../shared/pipes/localize-value.pipe';

interface EntityEditModel {
  legalName: string;
  tradeName: string;
  entityType: EntityType;
  country: string;
  region: string;
  city: string;
  productCategories: string;
  phoneNumbers: string;
}

@Component({
  selector: 'app-entity-profile',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    FormsModule,
    TranslateModule,
    ReviewCardComponent,
    StatCardComponent,
    LoadingSpinnerComponent,
    LocalizeValuePipe,
  ],
  templateUrl: './entity-profile.component.html',
  styleUrl: './entity-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityProfileComponent implements OnInit {
  private apiService = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  authService = inject(AuthService);

  entity = signal<EntityDetail | null>(null);
  reviews = signal<Review[]>([]);
  loading = signal(true);
  reviewsLoading = signal(true);

  readonly isAdmin = computed(() => {
    const user = this.authService.currentUser();
    const role = user?.role;
    return role === 'Admin' || role === 'SuperAdmin' || role === 'ServiceTeam';
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // ?edit=true lets the admin entity table jump straight into the edit form rather
      // than dropping the moderator on the profile to hunt for the button. The form only
      // opens once the entity has loaded, and saving is authorized server-side either way.
      this.openEditOnLoad = this.route.snapshot.queryParamMap.get('edit') === 'true';
      this.loadEntity(id);
      this.loadReviews(id);
    }
  }

  private openEditOnLoad = false;

  get isVerified(): () => boolean {
    return () => this.entity()?.verificationStatus === VerificationStatus.Verified;
  }

  /** True when the current user is either the review author or a moderator. */
  canEditReview(review: Review): boolean {
    const user = this.authService.currentUser();
    const userId = user?.userId;
    return this.isAdmin() || (!!userId && review.reviewerId === userId);
  }

  onEditReview(review: Review): void {
    const isComment = review.severity === SeverityLevel.Info;
    this.router.navigate(['/submit-review'], {
      queryParams: { reviewId: review.id, mode: isComment ? 'comment' : 'review' },    });
  }

  onDeleteReview(review: Review): void {
    const message = this.translate.instant('review.deleteConfirm');
    this.confirmService.confirm({ message, color: 'warn' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.apiService.delete(`reviews/${review.id}`).subscribe({
        next: () => {
          this.reviews.update(list => list.filter(r => r.id !== review.id));
          this.toast.success(this.translate.instant('review.deleteSuccess'));
        },
        error: () => this.toast.error(this.translate.instant('review.deleteFailed')),
      });
    });
  }

  onHideReview(review: Review): void {
    // Hiding sets a distinct Hidden status (not Rejected, which means "never approved
    // during moderation") so the review disappears from the public timeline but can be
    // found and restored from Admin → Hidden Content.
    const message = this.translate.instant('review.hideConfirm');
    this.confirmService.confirm({ message, color: 'warn' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.apiService.put(`reviews/${review.id}/status`, { newStatus: ReviewStatus.Hidden }).subscribe({
        next: () => {
          this.reviews.update(list => list.filter(r => r.id !== review.id));
          this.toast.success(this.translate.instant('review.hideSuccess'));
        },
        error: () => this.toast.error(this.translate.instant('review.hideFailed')),
      });
    });
  }

  // ===== Admin inline entity edit =====
  editingEntity = signal(false);
  savingEntity = signal(false);
  entityEdit: EntityEditModel = {
    legalName: '',
    tradeName: '',
    entityType: EntityType.Supplier,
    country: '',
    region: '',
    city: '',
    productCategories: '',
    phoneNumbers: '',
  };

  openEntityEdit(): void {
    const e = this.entity();
    if (!e) return;
    this.entityEdit = {
      legalName: e.legalName,
      tradeName: e.tradeName || '',
      entityType: e.entityType,
      country: e.country,
      region: e.region || '',
      city: e.city || '',
      productCategories: e.productCategories || '',
      phoneNumbers: (e.phoneNumbers || []).map(p => p.phoneNumber).join(', '),
    };
    this.editingEntity.set(true);
  }

  cancelEntityEdit(): void {
    this.editingEntity.set(false);
  }

  saveEntityEdit(): void {
    const e = this.entity();
    if (!e || this.savingEntity()) return;
    if (!this.entityEdit.legalName.trim() || !this.entityEdit.country.trim()) {
      this.toast.warning(this.translate.instant('entity.editRequiredFields'));
      return;
    }
    this.savingEntity.set(true);
    const payload = {
      legalName: this.entityEdit.legalName.trim(),
      tradeName: this.entityEdit.tradeName.trim() || null,
      entityType: Number(this.entityEdit.entityType),
      country: this.entityEdit.country.trim(),
      region: this.entityEdit.region.trim() || null,
      city: this.entityEdit.city.trim() || null,
      productCategories: this.entityEdit.productCategories.trim() || null,
      phoneNumbers: this.entityEdit.phoneNumbers.split(',').map(s => s.trim()).filter(s => s.length > 0),
      weChatIds: (e.weChatIds || []).map(w => w.weChatId),
    };
    this.apiService.put(`entities/${e.id}`, payload).subscribe({
      next: () => {
        this.savingEntity.set(false);
        this.editingEntity.set(false);
        this.toast.success(this.translate.instant('entity.editSuccess'));
        this.loadEntity(e.id);
      },
      error: () => {
        this.savingEntity.set(false);
        this.toast.error(this.translate.instant('entity.editFailed'));
      },
    });
  }

  // ===== Admin entity visibility / deletion =====
  updatingEntity = signal(false);

  /** Hides the entity from public search and profile pages, or restores it. */
  toggleEntityVisibility(): void {
    const e = this.entity();
    if (!e || this.updatingEntity()) return;

    const hiding = !e.isHidden;
    const message = this.translate.instant(
      hiding ? 'entity.hideConfirm' : 'entity.unhideConfirm'
    );

    this.confirmService.confirm({ message, color: hiding ? 'warn' : 'primary' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.updatingEntity.set(true);
      this.apiService.put(`entities/${e.id}/visibility`, { isHidden: hiding }).subscribe({
        next: () => {
          this.updatingEntity.set(false);
          this.entity.update(current => (current ? { ...current, isHidden: hiding } : current));
          this.toast.success(
            this.translate.instant(hiding ? 'entity.hideSuccess' : 'entity.unhideSuccess')
          );
        },
        error: () => {
          this.updatingEntity.set(false);
          this.toast.error(
            this.translate.instant(hiding ? 'entity.hideFailed' : 'entity.unhideFailed')
          );
        },
      });
    });
  }

  /**
   * Permanently deletes the entity. The API refuses this while reviews still exist and
   * returns an explanatory message, which is surfaced verbatim.
   */
  deleteEntity(): void {
    const e = this.entity();
    if (!e || this.updatingEntity()) return;

    const message = this.translate.instant('entity.deleteConfirm', { name: e.legalName });

    this.confirmService.confirm({ message, color: 'warn' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.updatingEntity.set(true);
      this.apiService.delete(`entities/${e.id}`).subscribe({
        next: () => {
          this.updatingEntity.set(false);
          this.toast.success(this.translate.instant('entity.deleteSuccess'));
          this.router.navigate(['/search']);
        },
        error: (err) => {
          this.updatingEntity.set(false);
          const errors = err?.error?.errors;
          this.toast.error(
            Array.isArray(errors) && errors.length
              ? errors.join(' ')
              : this.translate.instant('entity.deleteFailed')
          );
        },
      });
    });
  }

  private loadEntity(id: string): void {
    this.apiService.get<EntityDetail>(`entities/${id}`).subscribe({
      next: (entity) => {
        this.entity.set(entity);
        this.loading.set(false);
        if (this.openEditOnLoad) {
          this.openEditOnLoad = false;
          this.openEntityEdit();
        }
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
