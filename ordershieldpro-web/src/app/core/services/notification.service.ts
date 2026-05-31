import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from '../auth/services/auth.service';
import { Notification } from '../models/notification.model';
import { PaginatedResult } from '../models/paginated-result.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = inject(ApiService);
  private authService = inject(AuthService);

  private _notifications = signal<Notification[]>([]);
  private _serverUnreadCount = signal<number>(0);

  readonly notifications = this._notifications.asReadonly();
  // Prefer server-reported count (cheap endpoint, always fresh) and fall back
  // to whatever we have locally so the badge updates immediately on read.
  readonly unreadCount = computed(() => {
    const local = this._notifications().filter(n => !n.isRead).length;
    const server = this._serverUnreadCount();
    return Math.max(local, server);
  });

  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private static readonly POLL_MS = 60_000;

  constructor() {
    // Start/stop polling in response to auth state.
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.refreshUnreadCount();
        this.startPolling();
      } else {
        this.stopPolling();
        this._notifications.set([]);
        this._serverUnreadCount.set(0);
      }
    });
  }

  loadNotifications(): void {
    this.api.get<PaginatedResult<Notification> | Notification[]>('notifications', { page: 1, pageSize: 50 })
      .subscribe({
        next: result => {
          const items = Array.isArray(result) ? result : (result?.items ?? []);
          this._notifications.set(items);
          this._serverUnreadCount.set(items.filter(n => !n.isRead).length);
        },
        error: () => {}
      });
  }

  refreshUnreadCount(): void {
    this.api.get<{ count: number }>('notifications/unread-count').subscribe({
      next: r => this._serverUnreadCount.set(r?.count ?? 0),
      error: () => {}
    });
  }

  markAsRead(notificationId: string): void {
    this.api.put(`notifications/${notificationId}/read`, {}).subscribe({
      next: () => {
        this._notifications.update(notifications =>
          notifications.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
        );
        this._serverUnreadCount.update(c => Math.max(0, c - 1));
      }
    });
  }

  markAllAsRead(): void {
    this.api.put('notifications/read-all', {}).subscribe({
      next: () => {
        this._notifications.update(notifications =>
          notifications.map(n => n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() })
        );
        this._serverUnreadCount.set(0);
      }
    });
  }

  private startPolling(): void {
    if (this.pollHandle) return;
    this.pollHandle = setInterval(() => this.refreshUnreadCount(), NotificationService.POLL_MS);
  }

  private stopPolling(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }
}
