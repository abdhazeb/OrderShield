import { Component, inject, signal, OnInit, input, output, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PendingAction } from '../../../../core/models';
import { AdminActionType } from '../../../../core/enums';

interface PendingUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  organization?: string | null;
  role: string;
  language: string;
  createdAt: string;
}

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
  private confirm = inject(ConfirmService);

  /**
   * Which queue to render. These two were originally one tab, but they are different jobs:
   * 'actions' is internal dual-control over what another admin proposed, 'users' is inbound
   * registrations. The shell mounts them separately — System → Approvals and
   * Users → Pending Registrations — so their badges no longer add up into one number that
   * tells you nothing about which queue needs you.
   */
  mode = input<'both' | 'actions' | 'users'>('both');

  countChange = output<number>();

  // Tab state
  activeSection = signal<'actions' | 'users'>('actions');

  // Action approvals
  pendingActions = signal<PendingAction[]>([]);
  pendingActionCount = signal(0);
  loadingActions = signal(false);

  // User approvals
  pendingUsers = signal<PendingUser[]>([]);
  pendingUserCount = signal(0);
  loadingUsers = signal(false);

  ngOnInit(): void {
    const mode = this.mode();
    if (mode !== 'both') this.activeSection.set(mode);

    if (mode !== 'users') this.loadPendingActions();
    if (mode !== 'actions') this.loadPendingUsers();
  }

  setSection(section: 'actions' | 'users'): void {
    this.activeSection.set(section);
  }

  /** Emits only the queue this instance is showing, so the tab badge matches the list. */
  private emitCount(): void {
    switch (this.mode()) {
      case 'actions':
        this.countChange.emit(this.pendingActionCount());
        break;
      case 'users':
        this.countChange.emit(this.pendingUserCount());
        break;
      default:
        this.countChange.emit(this.pendingActionCount() + this.pendingUserCount());
    }
  }

  private loadPendingActions(): void {
    this.loadingActions.set(true);
    // Backend returns a paged envelope: { items, totalCount, page, pageSize }.
    // Older callers may have returned a bare array — handle both shapes.
    this.apiService.get<PendingAction[] | { items: PendingAction[]; totalCount?: number }>('admin/actions/pending').subscribe({
      next: (res) => {
        const list: PendingAction[] = Array.isArray(res)
          ? res
          : (res?.items ?? []);
        this.pendingActions.set(list);
        this.pendingActionCount.set(list.length);
        this.emitCount();
        this.loadingActions.set(false);
      },
      error: () => {
        this.loadingActions.set(false);
        this.pendingActions.set([]);
      },
    });
  }

  private loadPendingUsers(): void {
    this.loadingUsers.set(true);
    this.apiService.get<{ items: PendingUser[]; totalCount?: number }>('admin/users/pending').subscribe({
      next: (res) => {
        const list = res?.items ?? [];
        this.pendingUsers.set(list);
        this.pendingUserCount.set(list.length);
        this.emitCount();
        this.loadingUsers.set(false);
      },
      error: () => {
        this.loadingUsers.set(false);
        this.pendingUsers.set([]);
      },
    });
  }

  approveAction(id: string): void {
    this.apiService.put<void>(`admin/actions/${id}/approve`, {}).subscribe({
      next: () => {
        this.pendingActions.update(list => list.filter(a => a.id !== id));
        this.pendingActionCount.update(c => Math.max(0, c - 1));
        this.emitCount();
      },
      error: () => this.toast.error(this.translate.instant('admin.failedApproveAction')),
    });
  }

  rejectAction(id: string): void {
    this.apiService.put<void>(`admin/actions/${id}/reject`, {}).subscribe({
      next: () => {
        this.pendingActions.update(list => list.filter(a => a.id !== id));
        this.pendingActionCount.update(c => Math.max(0, c - 1));
        this.emitCount();
      },
      error: () => this.toast.error(this.translate.instant('admin.failedRejectAction')),
    });
  }

  approveUser(user: PendingUser): void {
    this.apiService.put<void>(`admin/users/${user.id}/approve`, {}).subscribe({
      next: () => {
        this.pendingUsers.update(list => list.filter(u => u.id !== user.id));
        this.pendingUserCount.update(c => Math.max(0, c - 1));
        this.emitCount();
        this.toast.success(this.translate.instant('admin.userApprovals.approved', { name: user.fullName }));
      },
      error: () => this.toast.error(this.translate.instant('admin.userApprovals.failedApprove')),
    });
  }

  rejectUser(user: PendingUser): void {
    this.confirm.confirm({
      variant: 'danger',
      title: this.translate.instant('admin.userApprovals.confirmRejectTitle'),
      message: this.translate.instant('admin.userApprovals.confirmRejectMessage', { name: user.fullName }),
      confirmLabel: this.translate.instant('admin.userApprovals.reject'),
      cancelLabel: this.translate.instant('common.cancel'),
    }).subscribe(ok => {
      if (!ok) return;
      this.apiService.put<void>(`admin/users/${user.id}/reject`, {}).subscribe({
        next: () => {
          this.pendingUsers.update(list => list.filter(u => u.id !== user.id));
          this.pendingUserCount.update(c => Math.max(0, c - 1));
          this.emitCount();
          this.toast.success(this.translate.instant('admin.userApprovals.rejected', { name: user.fullName }));
        },
        error: () => this.toast.error(this.translate.instant('admin.userApprovals.failedReject')),
      });
    });
  }

  getActionTypeLabel(type: AdminActionType | string): string {
    // Backend serialises the enum as its string name (e.g. "PublishReview"),
    // but legacy callers may pass the numeric enum value. Handle both.
    const key = typeof type === 'string' ? type : AdminActionType[type];
    switch (key) {
      case 'PublishReview': return this.translate.instant('admin.actionType.publishReview');
      case 'RejectReview':  return this.translate.instant('admin.actionType.rejectReview');
      case 'EditReview':    return this.translate.instant('admin.actionType.editReview');
      case 'DeleteReview':  return this.translate.instant('admin.actionType.deleteReview');
      case 'ReplyEnquiry':  return this.translate.instant('admin.actionType.replyEnquiry');
      default:              return this.translate.instant('admin.actionType.unknown');
    }
  }
}
