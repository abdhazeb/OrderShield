import { Component, inject, signal, OnInit, output, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ContactMsg, PaginatedResult } from '../../../../core/models';

@Component({
  selector: 'app-contact-messages',
  standalone: true,
  imports: [DatePipe, TranslateModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './contact-messages.component.html',
  styleUrl: './contact-messages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactMessagesComponent implements OnInit {
  private apiService = inject(ApiService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);

  countChange = output<number>();

  contactMessages = signal<ContactMsg[]>([]);
  loadingMessages = signal(false);
  unreadMsgCount = signal(0);
  selectedMsg = signal<ContactMsg | null>(null);

  ngOnInit(): void {
    this.loadContactMessages();
  }

  private loadContactMessages(): void {
    this.loadingMessages.set(true);
    this.apiService.get<PaginatedResult<ContactMsg>>('contact?page=1&pageSize=100').subscribe({
      next: (res) => {
        const items: ContactMsg[] = res.items || [];
        this.contactMessages.set(items);
        const unread = items.filter((m: ContactMsg) => !m.isRead).length;
        this.unreadMsgCount.set(unread);
        this.countChange.emit(unread);
        this.loadingMessages.set(false);
      },
      error: () => {
        this.loadingMessages.set(false);
        this.contactMessages.set([]);
      }
    });
  }

  toggleMsg(msg: ContactMsg): void {
    if (this.selectedMsg()?.id === msg.id) {
      this.selectedMsg.set(null);
    } else {
      this.selectedMsg.set(msg);
    }
  }

  markMsgRead(id: string): void {
    this.apiService.put(`contact/${id}/read`, {}).subscribe({
      next: () => {
        this.contactMessages.update(list => list.map(m =>
          m.id === id ? { ...m, isRead: true, readAt: new Date().toISOString() } : m
        ));
        this.unreadMsgCount.update(c => Math.max(0, c - 1));
        this.countChange.emit(this.unreadMsgCount());
        this.selectedMsg.update(m => m && m.id === id ? { ...m, isRead: true, readAt: new Date().toISOString() } : m);
      },
      error: () => this.toast.error(this.translate.instant('admin.failedMarkRead'))
    });
  }
}
