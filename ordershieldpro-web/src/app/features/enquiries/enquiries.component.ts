import { Component, inject, OnInit, signal, computed, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';

interface PublicEnquiry {
  id: string;
  entityName: string;
  entityCountry?: string;
  enquiryChecklist?: string;
  status: string;
  replyMessage?: string;
  repliedAt?: string;
  createdAt: string;
  subscriberCount: number;
  resultEntityId?: string;
}

@Component({
  selector: 'app-enquiries',
  standalone: true,
  imports: [RouterLink, TranslateModule, DatePipe, LoadingSpinnerComponent],
  template: `
    <div class="enquiries-page">
      <!-- Hero Section -->
      <div class="page-hero">
        <div class="hero-content">
          <h1 class="page-title">{{ 'enquiries.title' | translate }}</h1>
          <p class="page-subtitle">{{ 'enquiries.subtitle' | translate }}</p>
          @if (authService.isAuthenticated()) {
            <a routerLink="/search" [queryParams]="{openEnquiry: 'true'}" class="btn-add-enquiry">
              ＋ {{ 'enquiries.addEnquiry' | translate }}
            </a>
          }
        </div>
      </div>

      <!-- Status Filter Tabs -->
      <div class="filter-tabs">
        <button class="tab-btn" [class.active]="activeFilter() === 'all'" (click)="setFilter('all')">
          {{ 'enquiries.filterAll' | translate }}
          <span class="tab-count">{{ totalCount() }}</span>
        </button>
        <button class="tab-btn" [class.active]="activeFilter() === 'Pending'" (click)="setFilter('Pending')">
          <span class="status-dot pending"></span>
          {{ 'enquiries.filterPending' | translate }}
        </button>
        <button class="tab-btn" [class.active]="activeFilter() === 'InProgress'" (click)="setFilter('InProgress')">
          <span class="status-dot in-progress"></span>
          {{ 'enquiries.filterInProgress' | translate }}
        </button>
        <button class="tab-btn" [class.active]="activeFilter() === 'Completed'" (click)="setFilter('Completed')">
          <span class="status-dot completed"></span>
          {{ 'enquiries.filterCompleted' | translate }}
        </button>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <app-loading-spinner />
      } @else if (enquiries().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>{{ 'enquiries.noEnquiries' | translate }}</h3>
          <p>{{ 'enquiries.noEnquiriesDesc' | translate }}</p>
          <a routerLink="/search" class="btn-primary">{{ 'enquiries.goSearch' | translate }}</a>
        </div>
      } @else {
        <!-- Enquiries Grid -->
        <div class="enquiries-grid">
          @for (enquiry of enquiries(); track enquiry.id) {
            <div class="enquiry-card" [class.completed]="enquiry.status === 'Completed'" [class.in-progress]="enquiry.status === 'InProgress'">
              <div class="card-header">
                <div class="entity-info">
                  <h3 class="entity-name">{{ enquiry.entityName }}</h3>
                  @if (enquiry.entityCountry) {
                    <span class="entity-country">📍 {{ enquiry.entityCountry }}</span>
                  }
                </div>
                <span class="status-badge" [class]="'status-' + enquiry.status.toLowerCase()">
                  @switch (enquiry.status) {
                    @case ('Pending') { ⏳ {{ 'enquiries.statusPending' | translate }} }
                    @case ('InProgress') { 🔍 {{ 'enquiries.statusInProgress' | translate }} }
                    @case ('Completed') { ✅ {{ 'enquiries.statusCompleted' | translate }} }
                    @default { {{ enquiry.status }} }
                  }
                </span>
              </div>

              <!-- Checklist tags -->
              @if (enquiry.enquiryChecklist) {
                <div class="checklist-tags">
                  @for (tag of parseChecklist(enquiry.enquiryChecklist); track tag) {
                    <span class="tag">{{ getChecklistLabel(tag) | translate }}</span>
                  }
                </div>
              }

              <!-- Reply section for completed enquiries -->
              @if (enquiry.status === 'Completed' && enquiry.replyMessage) {
                <div class="reply-section">
                  <div class="reply-label">{{ 'enquiry.teamReply' | translate }}</div>
                  <p class="reply-text">{{ enquiry.replyMessage }}</p>
                  @if (enquiry.repliedAt) {
                    <span class="reply-date">{{ enquiry.repliedAt | date:'MMM d, yyyy' }}</span>
                  }
                </div>
              }

              <!-- If resolved to an entity, show link -->
              @if (enquiry.resultEntityId) {
                <a [routerLink]="'/entity/' + enquiry.resultEntityId" class="view-entity-link">
                  {{ 'enquiries.viewEntity' | translate }} →
                </a>
              }

              <div class="card-footer">
                <div class="footer-meta">
                  <span class="date">{{ enquiry.createdAt | date:'MMM d, yyyy' }}</span>
                  <span class="subscribers">👥 {{ enquiry.subscriberCount }} {{ 'enquiry.interested' | translate }}</span>
                </div>
                @if (authService.isAuthenticated() && enquiry.status !== 'Completed') {
                  @if (subscribedIds().has(enquiry.id)) {
                    <span class="subscribed-label">✅ {{ 'enquiry.alreadySubscribed' | translate }}</span>
                  } @else {
                    <button class="btn-subscribe" [disabled]="subscribingId() === enquiry.id" (click)="subscribe(enquiry.id)">
                      🔔 {{ subscribingId() === enquiry.id ? ('common.loading' | translate) : ('enquiry.notifyMe' | translate) }}
                    </button>
                  }
                } @else if (!authService.isAuthenticated() && enquiry.status !== 'Completed') {
                  <a routerLink="/login" class="btn-subscribe-link">🔒 {{ 'enquiries.loginToSubscribe' | translate }}</a>
                }
              </div>
            </div>
          }
        </div>

        <!-- Load more -->
        @if (hasNextPage()) {
          <button class="btn-load-more" [disabled]="loadingMore()" (click)="loadMore()">
            {{ loadingMore() ? ('common.loading' | translate) : ('enquiries.loadMore' | translate) }}
          </button>
        }
      }

      <!-- Toast -->
      @if (showToast()) {
        <div class="toast-message toast-success">{{ toastMessage() }}</div>
      }
    </div>
  `,
  styles: [`
    .enquiries-page {
      padding: 0;
    }

    /* ===== Hero ===== */
    .page-hero {
      position: relative;
      background: linear-gradient(135deg, var(--surface-0) 0%, var(--accent-50) 50%, var(--surface-50) 100%);
      border-bottom: 1px solid var(--surface-border-subtle);
      padding: 40px 20px 32px;
      overflow: hidden;
    }
    .hero-content {
      position: relative;
      z-index: 1;
      text-align: center;
    }
    .page-title {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 800;
      color: var(--navy-900);
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      font-size: 14px;
      color: var(--text-secondary);
      max-width: 500px;
      margin: 0 auto;
      line-height: 1.5;
    }
    .btn-add-enquiry {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 16px; padding: 10px 24px; border-radius: var(--radius-md);
      background: var(--accent-600); color: white; font-weight: 700; font-size: 14px;
      text-decoration: none; font-family: var(--font-body);
      transition: all var(--transition-fast); box-shadow: 0 2px 8px rgba(13, 115, 119, 0.2);
    }
    .btn-add-enquiry:hover { background: var(--accent-500); transform: translateY(-1px); box-shadow: var(--shadow-accent); }

    /* ===== Filter Tabs ===== */
    .filter-tabs {
      display: flex;
      gap: 6px;
      padding: 16px 16px 0;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: var(--radius-full);
      border: 1.5px solid var(--surface-border);
      background: var(--surface-0);
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
      font-family: var(--font-body);
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--transition-fast);
    }
    .tab-btn:hover {
      border-color: var(--accent-300);
      color: var(--accent-600);
    }
    .tab-btn.active {
      background: var(--accent-600);
      color: white;
      border-color: var(--accent-600);
    }
    .tab-count {
      background: rgba(255, 255, 255, 0.2);
      padding: 1px 8px;
      border-radius: var(--radius-full);
      font-size: 11px;
    }
    .tab-btn:not(.active) .tab-count {
      background: var(--surface-100);
      color: var(--text-tertiary);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .status-dot.pending { background: var(--severity-warning); }
    .status-dot.in-progress { background: var(--accent-500); }
    .status-dot.completed { background: var(--success); }

    /* ===== Empty State ===== */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.7;
    }
    .empty-state h3 {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 8px;
    }
    .empty-state p {
      font-size: 14px;
      color: var(--text-tertiary);
      margin-bottom: 20px;
    }

    /* ===== Grid ===== */
    .enquiries-grid {
      display: grid;
      gap: 12px;
      padding: 16px;
    }

    /* ===== Card ===== */
    .enquiry-card {
      background: var(--surface-0);
      border-radius: var(--radius-xl);
      padding: 20px;
      border: 1.5px solid var(--surface-border-subtle);
      transition: all var(--transition-base);
      box-shadow: var(--shadow-sm);
    }
    .enquiry-card:hover {
      border-color: var(--accent-200);
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }
    .enquiry-card.completed {
      border-color: rgba(16, 185, 129, 0.2);
      background: linear-gradient(135deg, var(--surface-0) 0%, rgba(16, 185, 129, 0.03) 100%);
    }
    .enquiry-card.in-progress {
      border-color: rgba(15, 145, 151, 0.2);
      background: linear-gradient(135deg, var(--surface-0) 0%, rgba(15, 145, 151, 0.03) 100%);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    .entity-name {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
    }
    .entity-country {
      font-size: 13px;
      color: var(--text-tertiary);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 12px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .status-pending {
      background: var(--severity-warning-bg);
      color: var(--severity-warning);
    }
    .status-inprogress {
      background: var(--accent-50);
      color: var(--accent-600);
    }
    .status-completed {
      background: var(--success-bg);
      color: var(--success);
    }

    /* ===== Checklist Tags ===== */
    .checklist-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 14px;
    }
    .tag {
      padding: 4px 12px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 500;
      background: var(--surface-100);
      color: var(--text-secondary);
      border: 1px solid var(--surface-border-subtle);
    }

    /* ===== Reply Section ===== */
    .reply-section {
      background: var(--accent-50);
      border: 1px solid var(--accent-100);
      border-radius: var(--radius-lg);
      padding: 14px;
      margin-bottom: 14px;
    }
    .reply-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--accent-600);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .reply-text {
      font-size: 14px;
      color: var(--text-primary);
      line-height: 1.6;
      margin-bottom: 6px;
    }
    .reply-date {
      font-size: 12px;
      color: var(--text-muted);
    }

    .view-entity-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 600;
      color: var(--accent-600);
      text-decoration: none;
      margin-bottom: 14px;
      transition: color var(--transition-fast);
    }
    .view-entity-link:hover {
      color: var(--accent-500);
    }

    /* ===== Card Footer ===== */
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 14px;
      border-top: 1px solid var(--surface-border-subtle);
    }
    .footer-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .date {
      font-size: 12px;
      color: var(--text-muted);
    }
    .subscribers {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .btn-subscribe {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      border-radius: var(--radius-md);
      background: var(--accent-600);
      color: white;
      font-size: 13px;
      font-weight: 600;
      font-family: var(--font-body);
      border: none;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .btn-subscribe:hover {
      background: var(--accent-500);
      transform: translateY(-1px);
    }
    .btn-subscribe:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-subscribe-link {
      font-size: 12px;
      color: var(--text-tertiary);
      text-decoration: none;
      font-weight: 600;
      transition: color var(--transition-fast);
    }
    .btn-subscribe-link:hover {
      color: var(--accent-600);
    }

    .subscribed-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--success);
    }

    /* ===== Load More ===== */
    .btn-load-more {
      display: block;
      width: calc(100% - 32px);
      margin: 0 16px 24px;
      padding: 14px;
      background: var(--surface-0);
      border: 1.5px solid var(--surface-border);
      border-radius: var(--radius-lg);
      color: var(--accent-600);
      font-weight: 600;
      font-size: 14px;
      font-family: var(--font-body);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .btn-load-more:hover {
      background: var(--accent-50);
      border-color: var(--accent-400);
    }
    .btn-load-more:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      display: inline-block;
      background: var(--accent-600);
      color: white;
      padding: 12px 28px;
      border-radius: var(--radius-lg);
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      transition: all var(--transition-base);
      border: none;
      cursor: pointer;
    }
    .btn-primary:hover {
      background: var(--accent-500);
      transform: translateY(-1px);
    }

    /* ===== Toast ===== */
    .toast-message {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      padding: 14px 28px;
      border-radius: var(--radius-lg);
      font-weight: 600;
      font-size: 14px;
      box-shadow: var(--shadow-xl);
      z-index: 1000;
      animation: slideUp 0.3s var(--ease-out);
    }
    .toast-success {
      background: #0d6b4a;
      color: white;
    }
    @keyframes slideUp {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }

    @media (min-width: 768px) {
      .enquiries-grid {
        grid-template-columns: repeat(2, 1fr);
        max-width: 900px;
        margin: 0 auto;
      }
      .page-hero {
        padding: 56px 40px 40px;
      }
      .page-title {
        font-size: 32px;
      }
    }

    /* ===== RTL overrides ===== */
    :host-context([dir="rtl"]) .entity-info,
    :host-context([dir="rtl"]) .entity-name,
    :host-context([dir="rtl"]) .entity-country,
    :host-context([dir="rtl"]) .reply-label,
    :host-context([dir="rtl"]) .reply-text {
      text-align: right;
    }
  `]
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

    this.apiService.get<any>(url).subscribe({
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
