import { Component, inject, signal, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { timer, switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { RelativeDatePipe } from '../../shared/pipes/relative-date.pipe';
import { NotificationType } from '../../core/enums';
import { AppNotification } from '../../core/models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [TranslateModule, LoadingSpinnerComponent, EmptyStateComponent, RelativeDatePipe],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent implements OnInit {
  private apiService = inject(ApiService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  notifications = signal<AppNotification[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    timer(0, 30000).pipe(
      switchMap(() => this.apiService.get<AppNotification[]>('notifications')),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
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
