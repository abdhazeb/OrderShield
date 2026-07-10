import { Component, inject, signal, OnInit, output, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, CurrencyPipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PendingReview, PaginatedResult } from '../../../../core/models';
import { SeverityLevel, ReviewStatus, ReviewerType } from '../../../../core/enums';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';

@Component({
  selector: 'app-moderation-queue',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, UpperCasePipe, FormsModule, TranslateModule, LoadingSpinnerComponent, EmptyStateComponent, FileSizePipe],
  templateUrl: './moderation-queue.component.html',
  styleUrl: './moderation-queue.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModerationQueueComponent implements OnInit {
  private apiService = inject(ApiService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private router = inject(Router);

  countChange = output<number>();

  pendingReviews = signal<PendingReview[]>([]);
  pendingCount = signal(0);
  loadingReviews = signal(false);
  selectedReview = signal<PendingReview | null>(null);

  showMessageForm = signal(false);
  messageReviewId = signal('');
  messageText = '';
  messageSent = signal(false);
  sendingMessage = signal(false);

  ngOnInit(): void {
    this.loadPendingReviews();
  }

  private loadPendingReviews(): void {
    this.loadingReviews.set(true);
    this.apiService.get<PaginatedResult<PendingReview>>('reviews/pending?page=1&pageSize=50').subscribe({
      next: (res) => {
        const items = res.items || [];
        this.pendingReviews.set(items);
        const count = res.totalCount ?? items.length;
        this.pendingCount.set(count);
        this.countChange.emit(count);
        this.loadingReviews.set(false);
      },
      error: () => {
        this.loadingReviews.set(false);
        this.pendingReviews.set([]);
        this.pendingCount.set(0);
        this.countChange.emit(0);
      }
    });
  }

  toggleReview(review: PendingReview): void {
    if (this.selectedReview()?.id === review.id) {
      this.selectedReview.set(null);
    } else {
      this.selectedReview.set(review);
    }
    this.showMessageForm.set(false);
    this.messageSent.set(false);
    this.messageText = '';
  }

  publishReview(id: string): void {
    this.confirmService.confirm({ message: this.translate.instant('admin.publishConfirm'), color: 'primary' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.apiService.put(`reviews/${id}/status`, { newStatus: ReviewStatus.Published }).subscribe({
        next: () => {
          this.pendingReviews.update(list => list.filter(r => r.id !== id));
          this.pendingCount.update(c => Math.max(0, c - 1));
          this.countChange.emit(this.pendingCount());
          this.selectedReview.set(null);
        },
        error: () => this.toast.error(this.translate.instant('admin.failedPublish'))
      });
    });
  }

  rejectReview(id: string): void {
    this.confirmService.confirm({ message: this.translate.instant('admin.rejectConfirm'), color: 'warn' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.apiService.put(`reviews/${id}/status`, { newStatus: ReviewStatus.Rejected }).subscribe({
        next: () => {
          this.pendingReviews.update(list => list.filter(r => r.id !== id));
          this.pendingCount.update(c => Math.max(0, c - 1));
          this.countChange.emit(this.pendingCount());
          this.selectedReview.set(null);
        },
        error: () => this.toast.error(this.translate.instant('admin.failedReject'))
      });
    });
  }

  openMessageForm(review: PendingReview): void {
    this.messageReviewId.set(review.id);
    this.showMessageForm.set(true);
    this.messageSent.set(false);
    this.messageText = '';
  }

  editReview(review: PendingReview): void {
    // Reuse the submit-review page in edit mode. The backend allows admins
    // to edit any review; the edit is applied without needing re-moderation.
    const isComment = review.severity === SeverityLevel.Info;
    this.router.navigate(['/submit-review'], {
      queryParams: { reviewId: review.id, mode: isComment ? 'comment' : 'review' },
      state: { review },
    });
  }

  deleteReview(review: PendingReview): void {
    const message = this.translate.instant('review.deleteConfirm');
    this.confirmService.confirm({ message, color: 'warn' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.apiService.delete(`reviews/${review.id}`).subscribe({
        next: () => {
          this.pendingReviews.update(list => list.filter(r => r.id !== review.id));
          this.pendingCount.update(c => Math.max(0, c - 1));
          this.countChange.emit(this.pendingCount());
          this.selectedReview.set(null);
          this.toast.success(this.translate.instant('review.deleteSuccess'));
        },
        error: () => this.toast.error(this.translate.instant('review.deleteFailed')),
      });
    });
  }

  approveEdit(id: string): void {
    this.confirmService.confirm({ message: this.translate.instant('admin.approveEditConfirm'), color: 'primary' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.apiService.put(`reviews/${id}/approve-edit`, {}).subscribe({
        next: () => {
          this.pendingReviews.update(list => list.filter(r => r.id !== id));
          this.pendingCount.update(c => Math.max(0, c - 1));
          this.countChange.emit(this.pendingCount());
          this.selectedReview.set(null);
          this.toast.success(this.translate.instant('admin.approveEditSuccess'));
        },
        error: () => this.toast.error(this.translate.instant('admin.failedApproveEdit')),
      });
    });
  }

  rejectEdit(id: string): void {
    this.confirmService.confirm({ message: this.translate.instant('admin.rejectEditConfirm'), color: 'warn' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.apiService.put(`reviews/${id}/reject-edit`, {}).subscribe({
        next: () => {
          this.pendingReviews.update(list => list.filter(r => r.id !== id));
          this.pendingCount.update(c => Math.max(0, c - 1));
          this.countChange.emit(this.pendingCount());
          this.selectedReview.set(null);
          this.toast.success(this.translate.instant('admin.rejectEditSuccess'));
        },
        error: () => this.toast.error(this.translate.instant('admin.failedRejectEdit')),
      });
    });
  }

  parsePendingEdit(json: string | undefined): { severity: number; title: string; narrative: string; product?: string; productCategory?: string; incidentDate?: string; contactName?: string; contactPhoneUsed?: string } | null {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  }

  sendMessage(reviewId: string): void {
    if (!this.messageText.trim()) return;
    this.sendingMessage.set(true);
    this.apiService.post(`admin/reviews/${reviewId}/message`, {
      message: this.messageText.trim(),
      addAsNote: true
    }).subscribe({
      next: () => {
        this.sendingMessage.set(false);
        this.messageSent.set(true);
        this.messageText = '';
        setTimeout(() => this.messageSent.set(false), 3000);
      },
      error: () => {
        this.sendingMessage.set(false);
        this.toast.error(this.translate.instant('admin.failedSendMessage'));
      }
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

  getReviewerTypeLabel(type: ReviewerType): string {
    switch (type) {
      case ReviewerType.Broker: return this.translate.instant('admin.broker');
      case ReviewerType.Buyer: return this.translate.instant('admin.buyer');
      default: return this.translate.instant('admin.unknown');
    }
  }
}
