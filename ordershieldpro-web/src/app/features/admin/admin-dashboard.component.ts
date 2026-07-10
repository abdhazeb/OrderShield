import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { ModerationQueueComponent } from './components/moderation-queue/moderation-queue.component';
import { AdminAnalyticsComponent, AnalyticsNavigation } from './components/admin-analytics/admin-analytics.component';
import { ContactMessagesComponent } from './components/contact-messages/contact-messages.component';
import { SubscriptionRequestsComponent } from './components/subscription-requests/subscription-requests.component';
import { AdminApprovalsComponent } from './components/admin-approvals/admin-approvals.component';
import { AdminTeamComponent } from './components/admin-team/admin-team.component';
import { AdminSettingsComponent } from './components/admin-settings/admin-settings.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    TranslateModule,
    ModerationQueueComponent,
    AdminAnalyticsComponent,
    ContactMessagesComponent,
    SubscriptionRequestsComponent,
    AdminApprovalsComponent,
    AdminTeamComponent,
    AdminSettingsComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);
  authService = inject(AuthService);

  activeTab = signal<'queue' | 'analytics' | 'messages' | 'subscriptions' | 'approvals' | 'team' | 'settings'>('queue');

  // Badge counts
  pendingCount = signal(0);
  unreadMsgCount = signal(0);
  pendingSubCount = signal(0);
  pendingActionCount = signal(0);
  pendingUserCount = signal(0);

  ngOnInit(): void {
    if (this.authService.isSuperAdmin()) {
      this.loadPendingActionCount();
      this.loadPendingUserCount();
    }
  }

  private loadPendingActionCount(): void {
    this.apiService.get<{ count: number }>('admin/actions/pending-count').subscribe({
      next: (res) => this.pendingActionCount.set((res.count ?? 0) + this.pendingUserCount()),
      error: () => {},
    });
  }

  private loadPendingUserCount(): void {
    this.apiService.get<{ count: number }>('admin/users/pending-count').subscribe({
      next: (res) => {
        this.pendingUserCount.set(res.count ?? 0);
        // Re-aggregate the badge so it reflects users + actions.
        this.loadPendingActionCount();
      },
      error: () => {},
    });
  }

  onAnalyticsNavigate(target: AnalyticsNavigation): void {
    switch (target) {
      case 'queue':
        this.activeTab.set('queue');
        break;
      case 'entities':
        this.router.navigate(['/search'], { queryParams: { initial: 'true' } });
        break;
    }
  }
}
