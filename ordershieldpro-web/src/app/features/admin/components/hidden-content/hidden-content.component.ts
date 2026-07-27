import { Component, inject, signal, OnInit, input, output, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { HiddenEntity, HiddenReview, PaginatedResult } from '../../../../core/models';
import { ReviewStatus, SeverityLevel } from '../../../../core/enums';

/**
 * Admin → Hidden Content. Two independent lists:
 *  - Entities an admin hid (TradeEntity.IsHidden) — restored via the visibility endpoint.
 *  - Reviews an admin hid after publishing (Review.Status === Hidden, distinct from
 *    Rejected, which means "never approved during moderation") — restored by republishing.
 * Both support permanent deletion, reusing the existing delete endpoints and their rules
 * (an entity with any remaining reviews cannot be deleted; a review can always be deleted
 * by a moderator).
 *
 * The admin shell mounts this twice, once per half — hidden entities live under Entities
 * and hidden reviews under Moderation, because that is where a moderator looks for the
 * thing they hid. `mode` picks the half; 'both' keeps the original combined view for any
 * caller that still wants it.
 */
@Component({
  selector: 'app-hidden-content',
  standalone: true,
  imports: [DatePipe, UpperCasePipe, TranslateModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './hidden-content.component.html',
  styleUrl: './hidden-content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HiddenContentComponent implements OnInit {
  private apiService = inject(ApiService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private router = inject(Router);

  /** Which half to render: one of them, or both behind the original section tabs. */
  mode = input<'both' | 'entities' | 'reviews'>('both');

  countChange = output<number>();

  section = signal<'entities' | 'reviews'>('entities');

  hiddenEntities = signal<HiddenEntity[]>([]);
  loadingEntities = signal(false);
  processingEntityId = signal<string | null>(null);

  hiddenReviews = signal<HiddenReview[]>([]);
  loadingReviews = signal(false);
  processingReviewId = signal<string | null>(null);

  ngOnInit(): void {
    const mode = this.mode();
    if (mode !== 'both') this.section.set(mode);

    if (mode !== 'reviews') this.loadHiddenEntities();
    if (mode !== 'entities') this.loadHiddenReviews();
  }

  /** Emits only what this instance is actually showing, so the tab count matches the list. */
  private emitCount(): void {
    switch (this.mode()) {
      case 'entities':
        this.countChange.emit(this.hiddenEntities().length);
        break;
      case 'reviews':
        this.countChange.emit(this.hiddenReviews().length);
        break;
      default:
        this.countChange.emit(this.hiddenEntities().length + this.hiddenReviews().length);
    }
  }

  private loadHiddenEntities(): void {
    this.loadingEntities.set(true);
    this.apiService.get<PaginatedResult<HiddenEntity>>('entities/hidden?page=1&pageSize=50').subscribe({
      next: (res) => {
        this.hiddenEntities.set(res.items || []);
        this.loadingEntities.set(false);
        this.emitCount();
      },
      error: () => {
        this.loadingEntities.set(false);
        this.hiddenEntities.set([]);
      },
    });
  }

  private loadHiddenReviews(): void {
    this.loadingReviews.set(true);
    this.apiService.get<PaginatedResult<HiddenReview>>('reviews/hidden?page=1&pageSize=50').subscribe({
      next: (res) => {
        this.hiddenReviews.set(res.items || []);
        this.loadingReviews.set(false);
        this.emitCount();
      },
      error: () => {
        this.loadingReviews.set(false);
        this.hiddenReviews.set([]);
      },
    });
  }

  viewEntity(entity: HiddenEntity): void {
    this.router.navigate(['/entity', entity.id]);
  }

  unhideEntity(entity: HiddenEntity): void {
    if (this.processingEntityId()) return;
    this.confirmService
      .confirm({ message: this.translate.instant('entity.unhideConfirm'), color: 'primary' })
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.processingEntityId.set(entity.id);
        this.apiService.put(`entities/${entity.id}/visibility`, { isHidden: false }).subscribe({
          next: () => {
            this.processingEntityId.set(null);
            this.hiddenEntities.update(list => list.filter(e => e.id !== entity.id));
            this.emitCount();
            this.toast.success(this.translate.instant('entity.unhideSuccess'));
          },
          error: () => {
            this.processingEntityId.set(null);
            this.toast.error(this.translate.instant('entity.unhideFailed'));
          },
        });
      });
  }

  deleteEntity(entity: HiddenEntity): void {
    if (this.processingEntityId()) return;
    const message = this.translate.instant('entity.deleteConfirm', { name: entity.legalName });
    this.confirmService.confirm({ message, color: 'warn' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.processingEntityId.set(entity.id);
      this.apiService.delete(`entities/${entity.id}`).subscribe({
        next: () => {
          this.processingEntityId.set(null);
          this.hiddenEntities.update(list => list.filter(e => e.id !== entity.id));
          this.emitCount();
          this.toast.success(this.translate.instant('entity.deleteSuccess'));
        },
        error: (err) => {
          this.processingEntityId.set(null);
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

  viewReviewEntity(review: HiddenReview): void {
    this.router.navigate(['/entity', review.tradeEntityId]);
  }

  restoreReview(review: HiddenReview): void {
    if (this.processingReviewId()) return;
    this.confirmService
      .confirm({ message: this.translate.instant('admin.restoreReviewConfirm'), color: 'primary' })
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.processingReviewId.set(review.id);
        this.apiService.put(`reviews/${review.id}/status`, { newStatus: ReviewStatus.Published }).subscribe({
          next: () => {
            this.processingReviewId.set(null);
            this.hiddenReviews.update(list => list.filter(r => r.id !== review.id));
            this.emitCount();
            this.toast.success(this.translate.instant('admin.restoreReviewSuccess'));
          },
          error: () => {
            this.processingReviewId.set(null);
            this.toast.error(this.translate.instant('admin.restoreReviewFailed'));
          },
        });
      });
  }

  deleteReview(review: HiddenReview): void {
    if (this.processingReviewId()) return;
    const message = this.translate.instant('review.deleteConfirm');
    this.confirmService.confirm({ message, color: 'warn' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.processingReviewId.set(review.id);
      this.apiService.delete(`reviews/${review.id}`).subscribe({
        next: () => {
          this.processingReviewId.set(null);
          this.hiddenReviews.update(list => list.filter(r => r.id !== review.id));
          this.emitCount();
          this.toast.success(this.translate.instant('review.deleteSuccess'));
        },
        error: () => {
          this.processingReviewId.set(null);
          this.toast.error(this.translate.instant('review.deleteFailed'));
        },
      });
    });
  }

  getSeverityString(severity: SeverityLevel): string {
    switch (severity) {
      case SeverityLevel.Info: return 'info';
      case SeverityLevel.Warning: return 'warning';
      case SeverityLevel.Critical: return 'critical';
      case SeverityLevel.Behavior: return 'behavior';
      case SeverityLevel.Fraud: return 'fraud';
      case SeverityLevel.Quality: return 'quality';
      case SeverityLevel.Delivery: return 'delivery';
      case SeverityLevel.Payment: return 'payment';
      default: return 'info';
    }
  }
}
