import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { RelativeDatePipe } from '../../shared/pipes/relative-date.pipe';
import { NotificationType } from '../../core/enums';

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  referenceEntityId?: string;
  referenceReviewId?: string;
  // Aliases for demo data
  entityId?: string;
  reviewId?: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [TranslateModule, LoadingSpinnerComponent, EmptyStateComponent, RelativeDatePipe],
  template: `
    <div class="notif-container">
      <div class="notif-header">
        <h1>{{ 'notification.title' | translate }}</h1>
        @if (notifications().length > 0) {
          <button class="mark-all-btn" (click)="markAllRead()">
            {{ 'notification.markAsRead' | translate }}
          </button>
        }
      </div>

      @if (loading()) {
        <app-loading-spinner [message]="'notification.loading' | translate" />
      } @else if (notifications().length === 0) {
        <app-empty-state icon="🔔" [title]="'notification.noNotificationsTitle' | translate" [subtitle]="'notification.allCaughtUp' | translate" />
      } @else {
        <div class="notif-list">
          @for (notif of notifications(); track notif.id) {
            <div class="notif-item" [class.unread]="!notif.isRead" [class.clickable]="hasLink(notif)" (click)="onNotifClick(notif)">
              <span class="notif-icon">{{ getIcon(notif.type) }}</span>
              <div class="notif-content">
                <strong class="notif-title">{{ notif.title }}</strong>
                <p class="notif-message">{{ notif.message }}</p>
                <span class="notif-time">{{ notif.createdAt | relativeDate }}</span>
              </div>
              @if (hasLink(notif)) {
                <span class="nav-arrow">→</span>
              }
              @if (!notif.isRead) {
                <span class="unread-dot"></span>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .notif-container { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
    .notif-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .notif-header h1 { font-size: 24px; font-weight: 800; color: var(--text-primary); font-family: var(--font-display); }
    .mark-all-btn {
      padding: 8px 16px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm);
      background: var(--surface-0); color: var(--accent-600); font-weight: 600; font-size: 13px;
      cursor: pointer; font-family: var(--font-body); transition: all var(--transition-fast);
    }
    .mark-all-btn:hover { background: var(--accent-50); }

    .notif-list { display: flex; flex-direction: column; gap: 4px; }
    .notif-item {
      display: flex; align-items: flex-start; gap: 14px; padding: 16px;
      background: var(--surface-0); border-radius: var(--radius-lg); border: 1px solid var(--surface-border);
      cursor: pointer; transition: all var(--transition-fast);
    }
    .notif-item:hover { background: var(--surface-50); }
    .notif-item.unread { background: var(--accent-50); border-color: var(--accent-200); }

    .notif-icon { font-size: 28px; flex-shrink: 0; }
    .notif-content { flex: 1; min-width: 0; }
    .notif-title { font-size: 14px; display: block; margin-bottom: 4px; color: var(--text-primary); font-weight: 600; }
    .notif-message { font-size: 13px; color: var(--text-tertiary); line-height: 1.4; margin: 0 0 6px; }
    .notif-time { font-size: 12px; color: var(--text-muted); }

    .unread-dot {
      width: 10px; height: 10px; background: var(--accent-600); border-radius: 50%;
      flex-shrink: 0; margin-top: 6px;
    }
    .nav-arrow {
      color: var(--accent-600); font-size: 18px; font-weight: 700; flex-shrink: 0; margin-top: 4px;
    }
    .notif-item.clickable:hover { background: var(--accent-50); }
    .notif-item.clickable { cursor: pointer; }

    /* ===== RTL overrides ===== */
    :host-context([dir="rtl"]) .notif-content {
      text-align: right;
    }
  `]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  notifications = signal<AppNotification[]>([]);
  loading = signal(false);
  private pollingInterval: any;

  ngOnInit(): void {
    this.loadNotifications();
    this.pollingInterval = setInterval(() => this.loadNotifications(), 30000);
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  private loadNotifications(): void {
    if (this.notifications().length === 0) this.loading.set(true);
    this.apiService.get<AppNotification[]>('notifications').subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : (data as any).items || [];
        this.notifications.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        if (this.notifications().length === 0) {
          // Demo data with entity references
          this.notifications.set([
            { id: '1', type: NotificationType.ReviewStatusChanged, title: 'Review Published', message: 'Your review for Guangzhou Tech Co. has been published and is now visible to the community.', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString(), entityId: 'demo-entity-1' },
            { id: '2', type: NotificationType.NewReviewOnFollowedEntity, title: 'New Review Alert', message: 'A new critical review has been posted for Shanghai Trading LLC, an entity in your watchlist.', isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString(), entityId: 'demo-entity-2' },
            { id: '3', type: NotificationType.ReviewStatusChanged, title: 'Clarification Added', message: 'The service team has added a clarification to a review about Beijing Machinery Ltd.', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString(), entityId: 'demo-entity-3' },
            { id: '4', type: NotificationType.WatchRequestResolved, title: 'Watch Request Resolved', message: 'Your watch request for Zhejiang Textiles has been resolved.', isRead: true, createdAt: new Date(Date.now() - 172800000).toISOString(), entityId: 'demo-entity-4' },
            { id: '5', type: NotificationType.InvestigationComplete, title: 'Investigation Complete', message: 'The investigation you requested for Shenzhen Electronics is now complete.', isRead: true, createdAt: new Date(Date.now() - 259200000).toISOString(), entityId: 'demo-entity-5' },
          ]);
        }
      }
    });
  }

  onNotifClick(notif: AppNotification): void {
    // Mark as read
    if (!notif.isRead) {
      this.apiService.put(`notifications/${notif.id}/read`, {}).subscribe({
        next: () => {},
        error: () => {},
      });
      this.notifications.update(list =>
        list.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
      );
    }

    // Navigate to relevant page based on notification type and references
    const entityRef = notif.referenceEntityId || notif.entityId;
    const reviewRef = notif.referenceReviewId || notif.reviewId;

    if (entityRef) {
      this.router.navigate(['/entity', entityRef]);
    } else if (reviewRef) {
      // Reviews are shown within entity pages; navigate to profile
      this.router.navigate(['/profile']);
    } else {
      // Generic notifications — navigate based on type
      switch (notif.type) {
        case NotificationType.ReviewStatusChanged:
          this.router.navigate(['/profile']);
          break;
        case NotificationType.InvestigationComplete:
        case NotificationType.WatchRequestResolved:
          this.router.navigate(['/profile']);
          break;
        default:
          break;
      }
    }
  }

  hasLink(notif: AppNotification): boolean {
    return !!(notif.referenceEntityId || notif.entityId || notif.referenceReviewId || notif.reviewId || notif.type !== undefined);
  }

  markAsRead(notif: AppNotification): void {
    if (notif.isRead) return;

    this.apiService.put(`notifications/${notif.id}/read`, {}).subscribe({
      next: () => {},
      error: () => {},
    });

    this.notifications.update(list =>
      list.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
    );
  }

  markAllRead(): void {
    this.apiService.put('notifications/read-all', {}).subscribe({
      next: () => {},
      error: () => {},
    });
    this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
  }

  getIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.NewReviewOnFollowedEntity: return '⚠️';
      case NotificationType.ReviewStatusChanged: return '📝';
      case NotificationType.InvestigationComplete: return '🔍';
      case NotificationType.WatchRequestResolved: return '✅';
      default: return '🔔';
    }
  }
}
