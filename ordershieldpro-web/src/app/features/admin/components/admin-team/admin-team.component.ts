import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { TeamMember } from '../../../../core/models';

@Component({
  selector: 'app-admin-team',
  standalone: true,
  imports: [DatePipe, FormsModule, TranslateModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './admin-team.component.html',
  styleUrl: './admin-team.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminTeamComponent implements OnInit {
  private apiService = inject(ApiService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);

  teamMembers = signal<TeamMember[]>([]);
  loadingTeam = signal(false);
  showNewAdminForm = signal(false);
  creatingAdmin = signal(false);
  newAdmin = { fullName: '', email: '', password: '' };

  ngOnInit(): void {
    this.loadTeam();
  }

  private loadTeam(): void {
    this.loadingTeam.set(true);
    this.apiService.get<TeamMember[]>('admin/team').subscribe({
      next: (res) => {
        this.teamMembers.set(res || []);
        this.loadingTeam.set(false);
      },
      error: () => {
        this.loadingTeam.set(false);
        this.teamMembers.set([]);
      },
    });
  }

  createAdmin(): void {
    this.creatingAdmin.set(true);
    this.apiService.post<TeamMember>('admin/team', this.newAdmin).subscribe({
      next: () => {
        this.creatingAdmin.set(false);
        this.showNewAdminForm.set(false);
        this.newAdmin = { fullName: '', email: '', password: '' };
        this.teamMembers.set([]);
        this.loadTeam();
      },
      error: (err) => {
        this.creatingAdmin.set(false);
        this.toast.error(err?.error?.message || this.translate.instant('admin.failedCreateAdmin'));
      },
    });
  }

  toggleAdminActive(userId: string, isCurrentlyActive: boolean): void {
    const action = isCurrentlyActive ? 'freeze' : 'unfreeze';
    this.confirmService.confirm({ message: this.translate.instant('admin.confirmToggleAdmin', { action }), color: 'warn' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.apiService.put<void>(`admin/team/${userId}/toggle-active`, {}).subscribe({
        next: () => {
          this.teamMembers.update(list => list.map(m =>
            m.id === userId ? { ...m, isActive: !m.isActive } : m
          ));
        },
        error: () => this.toast.error(this.translate.instant('admin.failedToggleAdmin')),
      });
    });
  }

  deleteAdmin(userId: string, name: string): void {
    this.confirmService.confirm({ message: this.translate.instant('admin.confirmDeleteAdmin', { name }), color: 'warn' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.apiService.delete<void>(`admin/team/${userId}`).subscribe({
        next: () => {
          this.teamMembers.update(list => list.filter(m => m.id !== userId));
        },
        error: () => this.toast.error(this.translate.instant('admin.failedDeleteAdmin')),
      });
    });
  }
}
