import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Notification } from '../models/notification.model';
import { PaginatedResult } from '../models/paginated-result.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter(n => !n.isRead).length);

  constructor(private api: ApiService) {}

  loadNotifications(): void {
    this.api.get<PaginatedResult<Notification>>('notifications', { page: 1, pageSize: 50 })
      .subscribe({
        next: result => this._notifications.set(result.items),
        error: () => {} // Silently fail — user might not be authenticated
      });
  }

  markAsRead(notificationId: string): void {
    this.api.put(`notifications/${notificationId}/read`, {}).subscribe({
      next: () => {
        this._notifications.update(notifications =>
          notifications.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
        );
      }
    });
  }
}
