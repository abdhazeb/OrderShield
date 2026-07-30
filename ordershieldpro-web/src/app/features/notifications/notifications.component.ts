import { Component, inject, signal, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
  private translate = inject(TranslateService);

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
      this.notificationService.markAsRead(notif.id);
      this.notifications.update(list =>
        list.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
      );
    }

    const destination = this.resolveDestination(notif);
    if (destination) {
      this.router.navigate(destination.path, { queryParams: destination.queryParams });
    }
  }

  hasLink(notif: AppNotification): boolean {
    return this.resolveDestination(notif) !== null;
  }

  /**
   * Single source of truth for where a notification click goes — used by both the click
   * handler and `hasLink` (which decides whether the row shows a nav arrow at all), so a
   * type can never look clickable and then silently do nothing on click.
   *
   * Some types route to a fixed admin screen regardless of any entity/review reference
   * (registration approval, review moderation) because that screen — not the entity or
   * review itself — is where the recipient needs to act. Everything else falls through to
   * the generic entity/review reference, and only returns null when neither this
   * notification's type nor its references point anywhere real.
   */
  private resolveDestination(notif: AppNotification): { path: any[]; queryParams?: Record<string, string> } | null {
    const entityRef = notif.referenceEntityId || notif.entityId;
    const reviewRef = notif.referenceReviewId || notif.reviewId;

    switch (notif.type) {
      case NotificationType.NewUserPendingApproval:
        // Always sent to SuperAdmins, who are the only ones who can see this screen.
        return { path: ['/admin'], queryParams: { section: 'users', tab: 'pendingUsers' } };

      case NotificationType.NewReviewPendingApproval:
        // Deep-links straight into the moderation dossier — the reviewId is always set
        // for this type (see CreateReviewCommandHandler / UpdateReviewCommandHandler) —
        // falling back to the queue only guards against a malformed notification.
        return reviewRef
          ? { path: ['/admin/reviews', reviewRef] }
          : { path: ['/admin'], queryParams: { section: 'moderation', tab: 'queue' } };

      case NotificationType.NewWatchRequestPendingReview:
        // No dedicated enquiry-review queue exists yet in the admin UI; land on the shell
        // rather than a 404. See CLAUDE.md for this known gap.
        return { path: ['/admin'] };

      case NotificationType.AdminActionApproved:
      case NotificationType.AdminActionRejected:
        return { path: ['/admin'], queryParams: { section: 'system', tab: 'approvals' } };

      case NotificationType.UserAccountApproved:
        return { path: ['/profile'] };

      case NotificationType.ReviewRejected:
        // A rejected review is never published, so /entity/:id — where entityRef would
        // otherwise point — has nothing to show for it. The reviewer's own submissions,
        // including rejected ones, live on their profile.
        return { path: ['/profile'] };
    }

    if (entityRef) {
      return { path: ['/entity', entityRef] };
    }
    if (reviewRef) {
      // Reviews are shown within entity pages; the profile lists the reviewer's own.
      return { path: ['/profile'] };
    }

    switch (notif.type) {
      case NotificationType.ReviewStatusChanged:
      case NotificationType.InvestigationComplete:
      case NotificationType.WatchRequestResolved:
        return { path: ['/profile'] };
      case NotificationType.EnquiryReply:
      case NotificationType.WatchRequestAccepted:
      case NotificationType.WatchRequestRejected:
        // No entity was created (rejected) or the reply carries no reference — the
        // requester's own enquiry list is the closest thing to "where this happened".
        return { path: ['/enquiries'] };
      default:
        return null;
    }
  }

  markAsRead(notif: AppNotification): void {
    if (notif.isRead) return;

    this.notificationService.markAsRead(notif.id);

    this.notifications.update(list =>
      list.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
    );
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead();
    this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
  }

  /**
   * Notifications are created server-side with an English fallback plus, for anything
   * that isn't inherently free text (a moderator's own message), a `templateKey` naming a
   * fully localized template under notification.templates and a `subject` — the one piece
   * of user-authored text (a review title, an entity name) the template interpolates.
   * Free-text notifications have no templateKey and fall back to the stored text.
   */
  getTitle(notif: AppNotification): string {
    if (!notif.templateKey) return notif.title;
    return this.translate.instant(`notification.templates.${notif.templateKey}.title`, {
      subject: notif.subject ?? '',
    });
  }

  getMessage(notif: AppNotification): string {
    if (!notif.templateKey) return notif.message;
    return this.translate.instant(`notification.templates.${notif.templateKey}.message`, {
      subject: notif.subject ?? '',
    });
  }

  getIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.NewReviewOnFollowedEntity: return '⚠️';
      case NotificationType.ReviewStatusChanged: return '📝';
      case NotificationType.InvestigationComplete: return '🔍';
      case NotificationType.WatchRequestResolved: return '✅';
      case NotificationType.NewUserPendingApproval: return '👤';
      case NotificationType.NewReviewPendingApproval: return '🛡️';
      case NotificationType.NewWatchRequestPendingReview: return '📨';
      case NotificationType.UserAccountApproved: return '🎉';
      case NotificationType.ReviewApproved: return '✅';
      case NotificationType.ReviewRejected: return '❌';
      case NotificationType.WatchRequestAccepted: return '✅';
      case NotificationType.WatchRequestRejected: return '❌';
      case NotificationType.AdminActionApproved: return '✅';
      case NotificationType.AdminActionRejected: return '❌';
      case NotificationType.EnquiryReply: return '💬';
      default: return '🔔';
    }
  }
}
