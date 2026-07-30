import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EvidenceViewerComponent } from '../../../../shared/components/evidence-viewer/evidence-viewer.component';
import { LocalizeValuePipe } from '../../../../shared/pipes/localize-value.pipe';
import { ReviewModeration } from '../../../../core/models';
import { ReviewStatus, SeverityLevel, ReviewerType, VerificationStatus } from '../../../../core/enums';
import { severityKey } from '../../../../core/utils/severity-label';

/**
 * Full-page moderation dossier for a single review: the whole submission, who filed it,
 * the counterparty they dealt with, and every uploaded file rendered inline (via
 * app-evidence-viewer) — so a moderator can actually assess the claim before publishing
 * or rejecting it.
 */
@Component({
  selector: 'app-review-dossier',
  standalone: true,
  imports: [
    RouterLink, DatePipe, CurrencyPipe, FormsModule, TranslateModule,
    LoadingSpinnerComponent, EvidenceViewerComponent, LocalizeValuePipe,
  ],
  templateUrl: './review-dossier.component.html',
  styleUrl: './review-dossier.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewDossierComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);

  readonly ReviewStatus = ReviewStatus;

  reviewId = '';
  review = signal<ReviewModeration | null>(null);
  loading = signal(true);
  notFound = signal(false);
  acting = signal(false);

  showMessageForm = signal(false);
  messageText = '';
  sendingMessage = signal(false);

  ngOnInit(): void {
    this.reviewId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.reviewId) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.get<ReviewModeration>(`reviews/${this.reviewId}/moderation`).subscribe({
      next: (data) => {
        this.review.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  // ── Labels ─────────────────────────────────────────────────────────────────

  severityLabel(severity: SeverityLevel): string {
    return this.translate.instant(severityKey(severity));
  }

  severityClass(severity: SeverityLevel): string {
    switch (severity) {
      case SeverityLevel.Critical:
      case SeverityLevel.Fraud:
      case SeverityLevel.Bankrupt:
      case SeverityLevel.FakeSupplier:
      case SeverityLevel.BribeOthers:
        return 'critical';
      case SeverityLevel.Info:
        return 'info';
      case SeverityLevel.Positive:
      case SeverityLevel.Recommended:
      case SeverityLevel.HighQuality:
      case SeverityLevel.OnTimeDelivery:
      case SeverityLevel.GoodCommunication:
      case SeverityLevel.Reliable:
        return 'positive';
      default:
        return 'warning';
    }
  }

  statusLabel(status: ReviewStatus): string {
    const keys: Record<number, string> = {
      [ReviewStatus.Pending]: 'admin.statusPending',
      [ReviewStatus.Published]: 'admin.statusPublished',
      [ReviewStatus.Amended]: 'admin.statusAmended',
      [ReviewStatus.Rejected]: 'admin.statusRejected',
      [ReviewStatus.PendingEdit]: 'admin.statusPendingEdit',
      [ReviewStatus.Hidden]: 'admin.statusHidden',
    };
    return this.translate.instant(keys[status] ?? 'admin.unknown');
  }

  reviewerTypeLabel(type: ReviewerType): string {
    switch (type) {
      case ReviewerType.Broker: return this.translate.instant('admin.broker');
      case ReviewerType.Buyer: return this.translate.instant('admin.buyer');
      default: return this.translate.instant('admin.unknown');
    }
  }

  verificationLabel(status: VerificationStatus): string {
    const keys: Record<number, string> = {
      [VerificationStatus.Unverified]: 'verification.unverified',
      [VerificationStatus.Verified]: 'verification.verified',
      [VerificationStatus.Clarified]: 'verification.clarified',
      [VerificationStatus.Insufficient]: 'verification.insufficient',
    };
    return this.translate.instant(keys[status] ?? 'admin.unknown');
  }

  parsedEvidenceLinks(): string[] {
    const raw = this.review()?.evidenceLinks;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : [];
    } catch {
      // Not JSON — treat it as newline/comma separated text the reviewer pasted.
      return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    }
  }

  parsedPendingEdit(): Record<string, any> | null {
    const raw = this.review()?.pendingEditJson;
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  // ── Moderation actions ─────────────────────────────────────────────────────

  publish(): void {
    this.changeStatus(ReviewStatus.Published, 'admin.publishConfirm', 'primary', 'admin.publishSuccess', 'admin.failedPublish');
  }

  reject(): void {
    this.changeStatus(ReviewStatus.Rejected, 'admin.rejectConfirm', 'warn', 'admin.rejectSuccess', 'admin.failedReject');
  }

  hide(): void {
    this.changeStatus(ReviewStatus.Hidden, 'review.hideConfirm', 'warn', 'review.hideSuccess', 'review.hideFailed');
  }

  private changeStatus(
    newStatus: ReviewStatus, confirmKey: string, color: 'primary' | 'warn',
    successKey: string, failKey: string,
  ): void {
    this.confirmService.confirm({ message: this.translate.instant(confirmKey), color }).subscribe(confirmed => {
      if (!confirmed) return;
      this.acting.set(true);
      this.api.put(`reviews/${this.reviewId}/status`, { newStatus }).subscribe({
        next: () => {
          this.acting.set(false);
          this.toast.success(this.translate.instant(successKey));
          this.backToQueue();
        },
        error: () => {
          this.acting.set(false);
          this.toast.error(this.translate.instant(failKey));
        },
      });
    });
  }

  approveEdit(): void {
    this.acting.set(true);
    this.api.put(`reviews/${this.reviewId}/approve-edit`, {}).subscribe({
      next: () => {
        this.acting.set(false);
        this.toast.success(this.translate.instant('admin.approveEditSuccess'));
        this.backToQueue();
      },
      error: () => {
        this.acting.set(false);
        this.toast.error(this.translate.instant('admin.failedApproveEdit'));
      },
    });
  }

  rejectEdit(): void {
    this.acting.set(true);
    this.api.put(`reviews/${this.reviewId}/reject-edit`, {}).subscribe({
      next: () => {
        this.acting.set(false);
        this.toast.success(this.translate.instant('admin.rejectEditSuccess'));
        this.backToQueue();
      },
      error: () => {
        this.acting.set(false);
        this.toast.error(this.translate.instant('admin.failedRejectEdit'));
      },
    });
  }

  deleteReview(): void {
    this.confirmService.confirm({
      message: this.translate.instant('review.deleteConfirm'), color: 'warn',
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.acting.set(true);
      this.api.delete(`reviews/${this.reviewId}`).subscribe({
        next: () => {
          this.acting.set(false);
          this.toast.success(this.translate.instant('review.deleteSuccess'));
          this.backToQueue();
        },
        error: () => {
          this.acting.set(false);
          this.toast.error(this.translate.instant('review.deleteFailed'));
        },
      });
    });
  }

  editReview(): void {
    const data = this.review();
    if (!data) return;
    this.router.navigate(['/submit-review'], {
      queryParams: { reviewId: data.id, mode: data.isComment ? 'comment' : 'review' },
    });
  }

  sendMessage(): void {
    if (!this.messageText.trim()) return;
    this.sendingMessage.set(true);
    this.api.post(`admin/reviews/${this.reviewId}/message`, {
      message: this.messageText.trim(),
      addAsNote: true,
    }).subscribe({
      next: () => {
        this.sendingMessage.set(false);
        this.showMessageForm.set(false);
        this.messageText = '';
        this.toast.success(this.translate.instant('admin.messageSent'));
        this.load();
      },
      error: () => {
        this.sendingMessage.set(false);
        this.toast.error(this.translate.instant('admin.failedSendMessage'));
      },
    });
  }

  private backToQueue(): void {
    this.router.navigate(['/admin'], { queryParams: { section: 'moderation', tab: 'queue' } });
  }
}
