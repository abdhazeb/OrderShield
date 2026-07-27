import { Component, inject, signal, computed, OnInit, output, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

/** A row of GET /api/admin/users. Roles and tiers come back as their enum names. */
export interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  organization?: string | null;
  region?: string | null;
  role: string;
  tier: string;
  subscriptionExpiryDate?: string | null;
  isActive: boolean;
  approvedAt?: string | null;
  isBusinessVerified: boolean;
  trustScore: number;
  createdAt: string;
  updatedAt?: string | null;
  reviewCount: number;
}

interface UserEditModel {
  fullName: string;
  role: string;
  tier: string;
  organization: string;
  region: string;
  phoneNumber: string;
  isBusinessVerified: boolean;
}

/**
 * Admin → Users → All Users. The full directory across every role, which is what the
 * admin area previously had no way to show — Team only ever listed admin accounts.
 *
 * Freeze is the primary removal: it blocks sign-in but keeps the account and everything
 * it authored. Deletion is refused server-side while the user still owns reviews or watch
 * requests (those foreign keys are Restrict, because reviews are verified records), and
 * that refusal is surfaced verbatim rather than flattened into a generic error.
 */
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [DatePipe, FormsModule, TranslateModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit {
  private apiService = inject(ApiService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private authService = inject(AuthService);

  countChange = output<number>();

  readonly pageSize = 25;
  /** Index position is the enum value the API expects — keep these in the enum's order. */
  readonly roles = ['Broker', 'Buyer', 'ServiceTeam', 'Admin', 'SuperAdmin'];
  readonly tiers = ['Free', 'Pro'];
  readonly statuses = ['all', 'active', 'frozen', 'pending'];

  users = signal<ManagedUser[]>([]);
  loading = signal(false);
  processingId = signal<string | null>(null);

  page = signal(1);
  totalCount = signal(0);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));

  searchTerm = '';
  roleFilter = signal('');
  statusFilter = signal('all');

  editingUser = signal<ManagedUser | null>(null);
  saving = signal(false);
  edit: UserEditModel = {
    fullName: '',
    role: 'Buyer',
    tier: 'Free',
    organization: '',
    region: '',
    phoneNumber: '',
    isBusinessVerified: false,
  };

  private searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload());
  }

  ngOnInit(): void {
    this.load();
  }

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.searchInput$.next(value);
  }

  onFilterChange(): void {
    this.reload();
  }

  private reload(): void {
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  private load(): void {
    this.loading.set(true);

    const params = new URLSearchParams();
    params.set('page', String(this.page()));
    params.set('pageSize', String(this.pageSize));
    if (this.searchTerm.trim()) params.set('q', this.searchTerm.trim());
    if (this.roleFilter()) params.set('role', this.roleFilter());
    if (this.statusFilter() !== 'all') params.set('status', this.statusFilter());

    this.apiService
      .get<{ items: ManagedUser[]; totalCount: number }>(`admin/users?${params.toString()}`)
      .subscribe({
        next: (res) => {
          this.users.set(res.items || []);
          this.totalCount.set(res.totalCount ?? 0);
          this.countChange.emit(res.totalCount ?? 0);
          this.loading.set(false);
        },
        error: () => {
          this.users.set([]);
          this.loading.set(false);
          this.toast.error(this.translate.instant('admin.userManagement.loadFailed'));
        },
      });
  }

  /** You cannot freeze, delete, or re-role yourself — the API refuses it too. */
  isSelf(user: ManagedUser): boolean {
    return this.authService.currentUser()?.userId === user.id;
  }

  /**
   * Inactive means two different things and the row has to say which: a registration
   * nobody has approved yet, versus an approved account a moderator froze.
   */
  statusOf(user: ManagedUser): 'active' | 'frozen' | 'pending' {
    if (user.isActive) return 'active';
    return user.approvedAt ? 'frozen' : 'pending';
  }

  openEdit(user: ManagedUser): void {
    this.edit = {
      fullName: user.fullName,
      role: user.role,
      tier: user.tier,
      organization: user.organization || '',
      region: user.region || '',
      phoneNumber: user.phoneNumber || '',
      isBusinessVerified: user.isBusinessVerified,
    };
    this.editingUser.set(user);
  }

  cancelEdit(): void {
    this.editingUser.set(null);
  }

  saveEdit(): void {
    const user = this.editingUser();
    if (!user || this.saving()) return;
    if (!this.edit.fullName.trim()) {
      this.toast.warning(this.translate.instant('admin.userManagement.nameRequired'));
      return;
    }

    this.saving.set(true);
    const payload = {
      fullName: this.edit.fullName.trim(),
      role: this.roles.indexOf(this.edit.role),
      tier: this.tiers.indexOf(this.edit.tier),
      organization: this.edit.organization.trim() || null,
      region: this.edit.region.trim() || null,
      phoneNumber: this.edit.phoneNumber.trim() || null,
      subscriptionExpiryDate: user.subscriptionExpiryDate ?? null,
      isBusinessVerified: this.edit.isBusinessVerified,
    };

    this.apiService.put(`admin/users/${user.id}`, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.editingUser.set(null);
        this.users.update(list =>
          list.map(u =>
            u.id === user.id
              ? {
                  ...u,
                  fullName: payload.fullName,
                  role: this.edit.role,
                  tier: this.edit.tier,
                  organization: payload.organization,
                  region: payload.region,
                  phoneNumber: payload.phoneNumber,
                  isBusinessVerified: payload.isBusinessVerified,
                }
              : u
          )
        );
        this.toast.success(this.translate.instant('admin.userManagement.saveSuccess'));
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(this.errorText(err, 'admin.userManagement.saveFailed'));
      },
    });
  }

  toggleActive(user: ManagedUser): void {
    if (this.processingId() || this.isSelf(user)) return;

    const freezing = user.isActive;
    const message = this.translate.instant(
      freezing ? 'admin.userManagement.freezeConfirm' : 'admin.userManagement.unfreezeConfirm',
      { name: user.fullName }
    );

    this.confirmService.confirm({ message, color: freezing ? 'warn' : 'primary' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.processingId.set(user.id);
      this.apiService.put<{ isActive: boolean }>(`admin/users/${user.id}/toggle-active`, {}).subscribe({
        next: (res) => {
          this.processingId.set(null);
          const nowActive = res?.isActive ?? !user.isActive;
          this.users.update(list =>
            list.map(u =>
              u.id === user.id
                ? { ...u, isActive: nowActive, approvedAt: nowActive ? (u.approvedAt ?? new Date().toISOString()) : u.approvedAt }
                : u
            )
          );
          this.toast.success(
            this.translate.instant(
              nowActive ? 'admin.userManagement.unfrozen' : 'admin.userManagement.frozen',
              { name: user.fullName }
            )
          );
        },
        error: (err) => {
          this.processingId.set(null);
          this.toast.error(this.errorText(err, 'admin.userManagement.toggleFailed'));
        },
      });
    });
  }

  deleteUser(user: ManagedUser): void {
    if (this.processingId() || this.isSelf(user)) return;

    // Deletion is refused server-side for anyone with reviews on record; saying so up
    // front is better than letting the moderator confirm and then hit a wall.
    if (user.reviewCount > 0) {
      this.toast.warning(
        this.translate.instant('admin.userManagement.deleteBlocked', {
          name: user.fullName,
          count: user.reviewCount,
        })
      );
      return;
    }

    const message = this.translate.instant('admin.userManagement.deleteConfirm', { name: user.fullName });
    this.confirmService.confirm({ message, color: 'warn' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.processingId.set(user.id);
      this.apiService.delete(`admin/users/${user.id}`).subscribe({
        next: () => {
          this.processingId.set(null);
          this.users.update(list => list.filter(u => u.id !== user.id));
          this.totalCount.update(c => Math.max(0, c - 1));
          this.countChange.emit(this.totalCount());
          this.toast.success(this.translate.instant('admin.userManagement.deleteSuccess'));
        },
        error: (err) => {
          this.processingId.set(null);
          this.toast.error(this.errorText(err, 'admin.userManagement.deleteFailed'));
        },
      });
    });
  }

  /** Prefers the API's explanation — it is the one that says *why* the action was refused. */
  private errorText(err: unknown, fallbackKey: string): string {
    const errors = (err as { error?: { errors?: unknown } })?.error?.errors;
    return Array.isArray(errors) && errors.length
      ? errors.join(' ')
      : this.translate.instant(fallbackKey);
  }
}
