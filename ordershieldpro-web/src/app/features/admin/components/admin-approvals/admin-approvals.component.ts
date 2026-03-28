import { Component, inject, signal, OnInit, output, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PendingAction } from '../../../../core/models';
import { AdminActionType } from '../../../../core/enums';

@Component({
  selector: 'app-admin-approvals',
  standalone: true,
  imports: [DatePipe, TranslateModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './admin-approvals.component.html',
  styleUrl: './admin-approvals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminApprovalsComponent implements OnInit {
  private apiService = inject(ApiService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);

  countChange = output<number>();

  pendingActions = signal<PendingAction[]>([]);
  pendingActionCount = signal(0);
  loadingActions = signal(false);

  ngOnInit(): void {
    this.loadPendingActions();
  }

  private loadPendingActions(): void {
    this.loadingActions.set(true);
    this.apiService.get<PendingAction[]>('admin/actions/pending').subscribe({
      next: (res) => {
        this.pendingActions.set(res || []);
        const count = (res || []).length;
        this.pendingActionCount.set(count);
        this.countChange.emit(count);
        this.loadingActions.set(false);
      },
      error: () => {
        this.loadingActions.set(false);
        this.pendingActions.set([]);
      },
    });
  }

  approveAction(id: string): void {
    this.apiService.put<void>(`admin/actions/${id}/approve`, {}).subscribe({
      next: () => {
        this.pendingActions.update(list => list.filter(a => a.id !== id));
        this.pendingActionCount.update(c => Math.max(0, c - 1));
        this.countChange.emit(this.pendingActionCount());
      },
      error: () => this.toast.error(this.translate.instant('admin.failedApproveAction')),
    });
  }

  rejectAction(id: string): void {
    this.apiService.put<void>(`admin/actions/${id}/reject`, {}).subscribe({
      next: () => {
        this.pendingActions.update(list => list.filter(a => a.id !== id));
        this.pendingActionCount.update(c => Math.max(0, c - 1));
        this.countChange.emit(this.pendingActionCount());
      },
      error: () => this.toast.error(this.translate.instant('admin.failedRejectAction')),
    });
  }

  getActionTypeLabel(type: AdminActionType): string {
    switch (type) {
      case AdminActionType.PublishReview: return this.translate.instant('admin.actionType.publishReview');
      case AdminActionType.RejectReview: return this.translate.instant('admin.actionType.rejectReview');
      case AdminActionType.EditReview: return this.translate.instant('admin.actionType.editReview');
      case AdminActionType.DeleteReview: return this.translate.instant('admin.actionType.deleteReview');
      case AdminActionType.ReplyEnquiry: return this.translate.instant('admin.actionType.replyEnquiry');
      default: return this.translate.instant('admin.actionType.unknown');
    }
  }
}
