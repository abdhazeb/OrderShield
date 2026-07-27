import { Component, inject, signal, OnInit, output, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, CurrencyPipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SubscriptionRequest, SubscriptionRequestStatus } from '../../../../core/models';
import { FileDownloadService } from '../../../../core/services/file-download.service';

@Component({
  selector: 'app-subscription-requests',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, UpperCasePipe, FormsModule, TranslateModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './subscription-requests.component.html',
  styleUrl: './subscription-requests.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionRequestsComponent implements OnInit {
  private apiService = inject(ApiService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  private fileDownload = inject(FileDownloadService);

  countChange = output<number>();

  subRequests = signal<SubscriptionRequest[]>([]);
  pendingSubCount = signal(0);
  loadingSubRequests = signal(false);
  selectedSubRequest = signal<SubscriptionRequest | null>(null);
  subAdminNotes = '';
  processingSubId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadSubscriptionRequests();
  }

  loadSubscriptionRequests(): void {
    this.loadingSubRequests.set(true);
    this.apiService.get<SubscriptionRequest[]>('subscriptions/pending-requests').subscribe({
      next: (res) => {
        this.subRequests.set(res || []);
        const count = (res || []).filter(r => r.status === SubscriptionRequestStatus.Pending).length;
        this.pendingSubCount.set(count);
        this.countChange.emit(count);
        this.loadingSubRequests.set(false);
      },
      error: () => {
        this.loadingSubRequests.set(false);
        this.subRequests.set([]);
      },
    });
  }

  toggleSubRequest(req: SubscriptionRequest): void {
    this.selectedSubRequest.set(this.selectedSubRequest()?.id === req.id ? null : req);
    this.subAdminNotes = '';
  }

  getSubTierLabel(tier: number): string {
    switch (tier) {
      case 1: return 'Pro';
      default: return 'Free';
    }
  }

  downloadPaymentProof(req: SubscriptionRequest): void {
    this.fileDownload.download(
      `subscriptions/${req.id}/payment-proof`,
      req.paymentProofFileName || 'payment-proof'
    );
  }

  getSubStatusClass(status: number): string {
    switch (status) {
      case 1: return 'approved';
      case 2: return 'rejected';
      default: return 'pending';
    }
  }

  getSubStatusLabel(status: number): string {
    switch (status) {
      case 1: return this.translate.instant('subscription.statusApproved');
      case 2: return this.translate.instant('subscription.statusRejected');
      default: return this.translate.instant('subscription.statusPending');
    }
  }

  approveSubRequest(id: string): void {
    this.processingSubId.set(id + '-approve');
    this.apiService.post<void>(`subscriptions/approve/${id}`, { adminNotes: this.subAdminNotes || null }).subscribe({
      next: () => {
        this.processingSubId.set(null);
        this.subAdminNotes = '';
        this.loadSubscriptionRequests();
      },
      error: (err) => {
        this.processingSubId.set(null);
        const errors = err?.error?.errors;
        this.toast.error(Array.isArray(errors) ? errors.join(', ') : (errors || this.translate.instant('admin.failedApproveSubscription')));
      },
    });
  }

  rejectSubRequest(id: string): void {
    this.processingSubId.set(id + '-reject');
    this.apiService.post<void>(`subscriptions/reject/${id}`, { adminNotes: this.subAdminNotes || null }).subscribe({
      next: () => {
        this.processingSubId.set(null);
        this.subAdminNotes = '';
        this.loadSubscriptionRequests();
      },
      error: (err) => {
        this.processingSubId.set(null);
        const errors = err?.error?.errors;
        this.toast.error(Array.isArray(errors) ? errors.join(', ') : (errors || this.translate.instant('admin.failedRejectSubscription')));
      },
    });
  }
}
