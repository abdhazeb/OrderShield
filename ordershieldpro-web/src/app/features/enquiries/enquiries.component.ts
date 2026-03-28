import { Component, inject, OnInit, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { PublicEnquiry, PaginatedResult } from '../../core/models';

@Component({
  selector: 'app-enquiries',
  standalone: true,
  imports: [RouterLink, TranslateModule, DatePipe, LoadingSpinnerComponent],
  templateUrl: './enquiries.component.html',
  styleUrl: './enquiries.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnquiriesComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  loadingMore = signal(false);
  enquiries = signal<PublicEnquiry[]>([]);
  totalCount = signal(0);
  currentPage = signal(1);
  hasNextPage = signal(false);
  activeFilter = signal<string>('all');

  subscribedIds = signal<Set<string>>(new Set());
  subscribingId = signal<string | null>(null);

  showToast = signal(false);
  toastMessage = signal('');

  private readonly checklistLabelMap: Record<string, string> = {
    'legitimacy': 'enquiry.checkLegitimacy',
    'quality': 'enquiry.checkQuality',
    'payment': 'enquiry.checkPayment',
    'delivery': 'enquiry.checkDelivery',
    'other': 'enquiry.checkOther',
  };

  ngOnInit(): void {
    this.loadEnquiries();
  }

  setFilter(filter: string): void {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
    this.enquiries.set([]);
    this.loadEnquiries();
  }

  loadEnquiries(): void {
    this.loading.set(true);
    const filter = this.activeFilter();
    let url = `watch-requests/public?page=${this.currentPage()}&pageSize=20`;
    if (filter !== 'all') {
      url += `&status=${filter}`;
    }

    this.apiService.get<PaginatedResult<PublicEnquiry>>(url).subscribe({
      next: (res) => {
        if (this.currentPage() === 1) {
          this.enquiries.set(res.items);
        } else {
          this.enquiries.update(prev => [...prev, ...res.items]);
        }
        this.totalCount.set(res.totalCount);
        this.hasNextPage.set(res.hasNextPage);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  loadMore(): void {
    this.loadingMore.set(true);
    this.currentPage.update(p => p + 1);
    this.loadEnquiries();
  }

  parseChecklist(checklist: string): string[] {
    return checklist.split(',').map(s => s.trim()).filter(Boolean);
  }

  getChecklistLabel(key: string): string {
    return this.checklistLabelMap[key] || key;
  }

  subscribe(enquiryId: string): void {
    this.subscribingId.set(enquiryId);
    this.apiService.post<any>(`watch-requests/${enquiryId}/subscribe`, {}).subscribe({
      next: () => {
        this.subscribingId.set(null);
        this.subscribedIds.update(ids => {
          const newSet = new Set(ids);
          newSet.add(enquiryId);
          return newSet;
        });
        this.showToastMessage(this.translate.instant('enquiry.subscribedSuccess'));
        // Update subscriber count locally
        this.enquiries.update(list =>
          list.map(e => e.id === enquiryId ? { ...e, subscriberCount: e.subscriberCount + 1 } : e)
        );
      },
      error: () => {
        this.subscribingId.set(null);
        // Probably already subscribed
        this.subscribedIds.update(ids => {
          const newSet = new Set(ids);
          newSet.add(enquiryId);
          return newSet;
        });
      },
    });
  }

  private showToastMessage(message: string): void {
    this.toastMessage.set(message);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 4000);
  }
}
