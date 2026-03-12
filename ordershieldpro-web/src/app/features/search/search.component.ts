import { Component, inject, OnInit, signal, computed, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { EntityCardComponent } from '../../shared/components/entity-card/entity-card.component';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { EntitySearchResult, PaginatedResult, WatchRequest } from '../../core/models';
import { InvestigationStatus } from '../../core/enums';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslateModule,
    DatePipe,
    EntityCardComponent,
    SearchBarComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <div class="search-page">
      <!-- Search Header -->
      <div class="search-header">
        <div class="search-row">
          <app-search-bar
            [searchTerm]="searchQuery()"
            [showFilter]="false"
            (searchTermChange)="onSearchInput($event)"
            (search)="performSearch()"
          />
          <button class="filters-toggle-btn" [class.active]="showFilters()" (click)="showFilters.set(!showFilters())">
            🔍 {{ 'search.filters' | translate }}
          </button>
        </div>
      </div>

      <!-- Filters Panel -->
      @if (showFilters()) {
        <div class="filters-panel">
          <div class="filter-group">
            <label>{{ 'search.country' | translate }}</label>
            <input type="text" [(ngModel)]="filters.country" (input)="performSearch()" [placeholder]="'search.filterPlaceholder.country' | translate" />
          </div>
          <div class="filter-group">
            <label>{{ 'search.category' | translate }}</label>
            <input type="text" [(ngModel)]="filters.category" (input)="performSearch()" [placeholder]="'search.filterPlaceholder.category' | translate" />
          </div>
          <div class="filter-group">
            <label>{{ 'search.reviewType' | translate }}</label>
            <select [(ngModel)]="filters.severity" (change)="performSearch()">
              <option value="">{{ 'search.allTypes' | translate }}</option>
              <option value="0">{{ 'severity.info' | translate }}</option>
              <option value="1">{{ 'severity.warning' | translate }}</option>
              <option value="2">{{ 'severity.critical' | translate }}</option>
              <option value="3">{{ 'severity.behavior' | translate }}</option>
              <option value="4">{{ 'severity.fraud' | translate }}</option>
              <option value="5">{{ 'severity.quality' | translate }}</option>
              <option value="6">{{ 'severity.delivery' | translate }}</option>
              <option value="7">{{ 'severity.payment' | translate }}</option>
              <option value="8">{{ 'severity.financiallyDistressed' | translate }}</option>
              <option value="9">{{ 'severity.bankrupt' | translate }}</option>
              <option value="10">{{ 'severity.poorManagement' | translate }}</option>
              <option value="11">{{ 'severity.inaccurateAppointments' | translate }}</option>
              <option value="12">{{ 'severity.bribeOthers' | translate }}</option>
              <option value="13">{{ 'severity.fakeSupplier' | translate }}</option>
              <option value="14">{{ 'severity.other' | translate }}</option>
            </select>
          </div>
        </div>
      }

      <!-- Results -->
      <div class="search-results">
        @if (hasSearched() && !loading()) {
          <div class="results-count">
            {{ 'search.results' | translate:{ count: totalCount() } }}
          </div>
        }

        @if (loading()) {
          <app-loading-spinner />
        } @else if (hasSearched() && entities().length === 0) {
          <!-- No Results -->
          <div class="no-results-section">
            @if (!directEnquiryMode()) {
              <div class="no-results-icon">🔍</div>
              <h2 class="no-results-title">{{ 'search.noResults' | translate }}</h2>
              <p class="no-results-subtitle">{{ 'enquiry.noResultsHint' | translate }}</p>
            }

            @if (!showNewEnquiryForm()) {
              <!-- Action Buttons -->
              <div class="no-results-actions">
                <a routerLink="/submit-review" class="btn-action btn-review">
                  ✍️ {{ 'nav.submit' | translate }}
                </a>
                @if (authService.isAuthenticated()) {
                  <button class="btn-action btn-enquiry" (click)="openEnquiryForm()">
                    📋 {{ 'enquiry.formTitle' | translate }}
                  </button>
                } @else {
                  <a routerLink="/login" class="btn-action btn-enquiry">
                    🔒 {{ 'nav.login' | translate }}
                  </a>
                }
              </div>
            } @else {
              <!-- Enquiry Panel (shown after clicking Send Enquiry) -->
              @if (checkingExisting()) {
                <app-loading-spinner />
              } @else if (existingEnquiry()) {
                <div class="existing-enquiry-card">
                  @if (existingEnquiry()!.status === InvestigationStatus.Completed && existingEnquiry()!.replyMessage) {
                    <div class="enquiry-badge completed">✅ {{ 'enquiry.alreadyCompleted' | translate }}</div>
                    <div class="reply-block">
                      <h4>{{ 'enquiry.teamReply' | translate }}</h4>
                      <p class="reply-text">{{ existingEnquiry()!.replyMessage }}</p>
                      <span class="reply-date">{{ existingEnquiry()!.repliedAt | date:'MMM d, yyyy' }}</span>
                    </div>
                    <button class="btn-secondary" (click)="openNewEnquiryForm()">{{ 'enquiry.submitNewAnyway' | translate }}</button>
                  } @else {
                    <div class="enquiry-badge pending">⏳ {{ 'enquiry.alreadyPending' | translate }}</div>
                    <p class="enquiry-info">
                      {{ 'enquiry.pendingDesc' | translate:{ name: existingEnquiry()!.entityName } }}
                    </p>
                    @if (existingEnquiry()!.subscriberCount !== undefined) {
                      <span class="subscriber-count">
                        👥 {{ existingEnquiry()!.subscriberCount }} {{ 'enquiry.interested' | translate }}
                      </span>
                    }
                    @if (!alreadySubscribed()) {
                      <button class="btn-primary btn-subscribe" [disabled]="subscribing()" (click)="subscribeToEnquiry()">
                        🔔 {{ subscribing() ? ('common.loading' | translate) : ('enquiry.notifyMe' | translate) }}
                      </button>
                    } @else {
                      <div class="subscribed-badge">✅ {{ 'enquiry.alreadySubscribed' | translate }}</div>
                    }
                    <button class="btn-link" (click)="openNewEnquiryForm()">{{ 'enquiry.submitNewAnyway' | translate }}</button>
                  }
                </div>
              } @else {
                <!-- Enquiry Form -->
                <div class="enquiry-form-card">
                  <h3 class="form-title">📋 {{ 'enquiry.formTitle' | translate }}</h3>
                  <p class="form-subtitle">{{ 'enquiry.formSubtitle' | translate }}</p>

                  <div class="form-grid">
                    <div class="form-group">
                      <label>{{ 'enquiry.supplierName' | translate }} *</label>
                      <input type="text" [ngModel]="enquiryEntityName()" (ngModelChange)="enquiryEntityName.set($event)" [placeholder]="'enquiry.supplierNameHint' | translate" />
                    </div>
                    <div class="form-group">
                      <label>{{ 'enquiry.country' | translate }}</label>
                      <input type="text" [(ngModel)]="enquiryForm.entityCountry" [placeholder]="'enquiry.placeholder.country' | translate" />
                    </div>
                    <div class="form-group">
                      <label>{{ 'enquiry.phone' | translate }}</label>
                      <input type="text" [(ngModel)]="enquiryForm.entityPhone" [placeholder]="'enquiry.placeholder.phone' | translate" />
                    </div>
                    <div class="form-group">
                      <label>{{ 'enquiry.wechat' | translate }}</label>
                      <input type="text" [(ngModel)]="enquiryForm.entityWeChat" [placeholder]="'enquiry.placeholder.wechat' | translate" />
                    </div>
                    <div class="form-group full-width">
                      <label>{{ 'enquiry.website' | translate }}</label>
                      <input type="text" [(ngModel)]="enquiryForm.entityWebsite" placeholder="https://..." />
                    </div>
                  </div>

                  <div class="checklist-section">
                    <h4>{{ 'enquiry.whatToKnow' | translate }}</h4>
                    <div class="checklist-grid">
                      @for (item of checklistItems; track item.key) {
                        <label class="checklist-item" [class.checked]="item.checked">
                          <input type="checkbox" [(ngModel)]="item.checked" />
                          <span class="check-icon">{{ item.checked ? '✅' : '⬜' }}</span>
                          <span>{{ item.labelKey | translate }}</span>
                        </label>
                      }
                    </div>
                  </div>

                  <div class="form-group full-width">
                    <label>{{ 'enquiry.additionalNotes' | translate }}</label>
                    <textarea [(ngModel)]="enquiryForm.additionalDetails" rows="3" [placeholder]="'enquiry.additionalNotesHint' | translate"></textarea>
                  </div>

                  <div class="form-actions">
                    <button class="btn-primary btn-submit-enquiry" [disabled]="!enquiryFormValid() || submittingEnquiry()" (click)="submitEnquiry()">
                      {{ submittingEnquiry() ? ('common.loading' | translate) : ('enquiry.submit' | translate) }}
                    </button>
                    <button class="btn-secondary" (click)="closeEnquiryPanel()">{{ 'common.cancel' | translate }}</button>
                  </div>
                </div>
              }
            }

            <!-- Toast -->
            @if (showToast()) {
              <div class="toast-message" [class.toast-success]="toastType() === 'success'" [class.toast-info]="toastType() === 'info'">
                {{ toastMessage() }}
              </div>
            }
          </div>
        } @else {
          @for (entity of displayedEntities(); track entity.id) {
            <app-entity-card [entity]="entity" />
          }

          @if (isGuestLimited()) {
            <div class="guest-limit-banner">
              <div class="limit-icon">🔒</div>
              <h3>{{ 'guest.limitReached' | translate }}</h3>
              <p>{{ 'guest.limitMessage' | translate }}</p>
              <a routerLink="/register" class="btn-signup">{{ 'guest.signUpNow' | translate }}</a>
              <div class="limit-count">
                {{ 'guest.resultsLimited' | translate:{ count: guestLimit, total: totalCount() } }}
              </div>
            </div>
          } @else if (hasNextPage()) {
            <button class="btn-load-more" (click)="loadMore()">
              {{ 'common.viewAll' | translate }}
            </button>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .search-page { padding: 16px; }
    .search-header { margin-bottom: 16px; }

    .search-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .search-row app-search-bar { flex: 1; }

    .filters-toggle-btn {
      background: var(--surface-0);
      border: 1.5px solid var(--surface-border);
      border-radius: var(--radius-lg);
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 600;
      font-family: var(--font-body);
      color: var(--text-secondary);
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--transition-fast);
      flex-shrink: 0;
    }
    .filters-toggle-btn:hover { border-color: var(--accent-400); color: var(--accent-600); }
    .filters-toggle-btn.active { background: var(--accent-50); border-color: var(--accent-400); color: var(--accent-600); }

    .no-results-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-top: 24px;
    }
    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 28px;
      border-radius: var(--radius-lg);
      font-weight: 700;
      font-size: 15px;
      font-family: var(--font-body);
      cursor: pointer;
      text-decoration: none;
      transition: all var(--transition-base);
      border: none;
    }
    .btn-review {
      background: var(--accent-600);
      color: white;
      box-shadow: 0 2px 8px rgba(13, 115, 119, 0.2);
    }
    .btn-review:hover { background: var(--accent-500); transform: translateY(-1px); box-shadow: var(--shadow-accent); }
    .btn-enquiry {
      background: var(--surface-0);
      color: var(--accent-600);
      border: 2px solid var(--accent-400);
    }
    .btn-enquiry:hover { background: var(--accent-50); transform: translateY(-1px); }

    .filters-panel {
      background: var(--surface-0);
      border-radius: var(--radius-lg);
      padding: 16px;
      margin-bottom: 16px;
      border: 1px solid var(--surface-border-subtle);
      box-shadow: var(--shadow-sm);
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .filter-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--text-secondary);
      font-size: 13px;
    }

    .filter-group select,
    .filter-group input {
      width: 100%;
      padding: 10px 12px;
      border: 1.5px solid var(--surface-border);
      border-radius: var(--radius-md);
      font-size: 14px;
      font-family: var(--font-body);
      color: var(--text-primary);
      background: var(--surface-0);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    .filter-group select:focus,
    .filter-group input:focus {
      outline: none;
      border-color: var(--accent-400);
      box-shadow: 0 0 0 3px rgba(15, 145, 151, 0.1);
    }

    .results-count {
      font-size: 13px;
      color: var(--text-tertiary);
      margin-bottom: 12px;
      font-weight: 500;
    }

    .btn-load-more {
      width: 100%;
      padding: 12px;
      background: var(--surface-0);
      border: 1.5px solid var(--surface-border);
      border-radius: var(--radius-lg);
      color: var(--accent-600);
      font-weight: 600;
      font-size: 14px;
      font-family: var(--font-body);
      cursor: pointer;
      margin-top: 12px;
      transition: all var(--transition-fast);
    }
    .btn-load-more:hover { background: var(--accent-50); border-color: var(--accent-400); }

    .guest-limit-banner {
      background: linear-gradient(135deg, var(--navy-50) 0%, var(--navy-100) 100%);
      border: 1.5px solid var(--navy-200);
      border-radius: var(--radius-xl);
      padding: 28px;
      text-align: center;
      margin-top: 16px;
    }
    .limit-icon { font-size: 36px; margin-bottom: 8px; }
    .guest-limit-banner h3 { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--navy-900); margin-bottom: 8px; }
    .guest-limit-banner p { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5; }
    .btn-signup {
      display: inline-block; background: var(--navy-900); color: white; padding: 12px 32px;
      border-radius: var(--radius-lg); font-weight: 700; font-size: 15px; text-decoration: none;
      transition: all var(--transition-base);
    }
    .btn-signup:hover { background: var(--navy-800); transform: translateY(-1px); box-shadow: var(--shadow-md); }
    .limit-count { font-size: 12px; color: var(--text-tertiary); margin-top: 12px; }

    /* ===== No Results / Enquiry Styles ===== */
    .no-results-section { text-align: center; padding: 16px 0; }
    .no-results-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.7; }
    .no-results-title { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
    .no-results-subtitle { font-size: 14px; color: var(--text-tertiary); margin-bottom: 24px; }

    .login-prompt-card {
      background: linear-gradient(135deg, var(--navy-50) 0%, var(--navy-100) 100%);
      border: 1.5px solid var(--navy-200);
      border-radius: var(--radius-xl); padding: 32px; max-width: 420px; margin: 0 auto;
    }
    .prompt-icon { font-size: 36px; margin-bottom: 12px; }
    .login-prompt-card h3 { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--navy-900); margin-bottom: 8px; }
    .login-prompt-card p { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; }
    .prompt-actions { display: flex; gap: 12px; justify-content: center; }

    .btn-primary {
      display: inline-block; background: var(--accent-600); color: white; padding: 10px 24px;
      border-radius: var(--radius-md); font-weight: 600; font-size: 14px; border: none; cursor: pointer;
      font-family: var(--font-body);
      text-decoration: none; transition: all var(--transition-base);
    }
    .btn-primary:hover { background: var(--accent-500); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-secondary {
      display: inline-block; background: var(--surface-0); color: var(--accent-600); padding: 10px 24px;
      border-radius: var(--radius-md); font-weight: 600; font-size: 14px; border: 1.5px solid var(--accent-400);
      font-family: var(--font-body);
      cursor: pointer; text-decoration: none; transition: all var(--transition-fast);
    }
    .btn-secondary:hover { background: var(--accent-50); }

    .btn-link {
      background: none; border: none; color: var(--accent-600); font-size: 13px;
      cursor: pointer; text-decoration: underline; margin-top: 12px;
      font-family: var(--font-body);
      display: block;
    }

    /* Existing enquiry card */
    .existing-enquiry-card {
      background: var(--surface-0); border-radius: var(--radius-xl); padding: 24px; max-width: 500px;
      margin: 0 auto; box-shadow: var(--shadow-md);
      border: 1px solid var(--surface-border-subtle); text-align: center;
    }
    .enquiry-badge {
      display: inline-block; padding: 6px 16px; border-radius: var(--radius-full);
      font-weight: 600; font-size: 14px; margin-bottom: 16px;
    }
    .enquiry-badge.completed { background: var(--success-bg); color: var(--success); }
    .enquiry-badge.pending { background: var(--severity-warning-bg); color: var(--severity-warning); }
    .enquiry-info { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5; }
    .subscriber-count { display: block; font-size: 13px; color: var(--text-tertiary); margin-bottom: 16px; }
    .btn-subscribe { margin-bottom: 8px; }
    .subscribed-badge {
      display: inline-block; padding: 8px 20px; background: var(--success-bg); color: var(--success);
      border-radius: var(--radius-md); font-weight: 600; font-size: 14px; margin-bottom: 12px;
    }
    .reply-block {
      background: var(--accent-50); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 16px;
      text-align: start; border: 1px solid var(--accent-100);
    }
    .reply-block h4 { font-size: 14px; font-weight: 700; color: var(--accent-600); margin-bottom: 8px; }
    .reply-text { font-size: 14px; color: var(--text-primary); line-height: 1.6; margin-bottom: 8px; }
    .reply-date { font-size: 12px; color: var(--text-muted); }

    /* Enquiry form card */
    .enquiry-form-card {
      background: var(--surface-0); border-radius: var(--radius-xl); padding: 24px; max-width: 600px;
      margin: 0 auto; box-shadow: var(--shadow-md);
      border: 1px solid var(--surface-border-subtle); text-align: start;
    }
    .form-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
    .form-subtitle { font-size: 14px; color: var(--text-tertiary); margin-bottom: 20px; }

    .form-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;
    }
    .form-group { display: flex; flex-direction: column; }
    .form-group.full-width { grid-column: span 2; }
    .form-group label { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
    .form-group input, .form-group textarea {
      padding: 10px 12px; border: 1.5px solid var(--surface-border); border-radius: var(--radius-md);
      font-size: 14px; font-family: var(--font-body); resize: vertical; color: var(--text-primary);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .form-group input:focus, .form-group textarea:focus {
      outline: none; border-color: var(--accent-400);
      box-shadow: 0 0 0 3px rgba(15, 145, 151, 0.1);
    }

    .checklist-section { margin-bottom: 16px; }
    .checklist-section h4 { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; }
    .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .checklist-item {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      border: 1.5px solid var(--surface-border); border-radius: var(--radius-md); cursor: pointer;
      font-size: 13px; color: var(--text-primary); transition: all var(--transition-fast);
    }
    .checklist-item:hover { border-color: var(--accent-300); background: var(--accent-50); }
    .checklist-item.checked { border-color: var(--accent-400); background: var(--accent-50); }
    .checklist-item input[type="checkbox"] { display: none; }
    .check-icon { font-size: 16px; }

    .form-actions { display: flex; gap: 12px; margin-top: 16px; }
    .btn-submit-enquiry { flex: 1; padding: 12px; font-size: 15px; }

    /* Toast */
    .toast-message {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      padding: 14px 28px; border-radius: var(--radius-lg); font-weight: 600; font-size: 14px;
      box-shadow: var(--shadow-xl); z-index: 1000; animation: slideUp 0.3s var(--ease-out);
    }
    .toast-success { background: #0d6b4a; color: white; }
    .toast-info { background: var(--navy-800); color: white; }
    @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }

    @media (min-width: 768px) {
      .search-page { padding: 2rem 0; }
      .filters-panel { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 480px) {
      .form-grid { grid-template-columns: 1fr; }
      .form-group.full-width { grid-column: span 1; }
      .checklist-grid { grid-template-columns: 1fr; }
    }

    /* ===== RTL overrides ===== */
    :host-context([dir="rtl"]) .form-group label,
    :host-context([dir="rtl"]) .form-group input,
    :host-context([dir="rtl"]) .form-group textarea,
    :host-context([dir="rtl"]) .filter-group label,
    :host-context([dir="rtl"]) .filter-group input,
    :host-context([dir="rtl"]) .filter-group select {
      text-align: right;
      direction: rtl;
    }
    :host-context([dir="rtl"]) .enquiry-form-card,
    :host-context([dir="rtl"]) .reply-block {
      text-align: right;
    }
    :host-context([dir="rtl"]) .existing-enquiry-card {
      text-align: center;
    }
    :host-context([dir="rtl"]) .form-title,
    :host-context([dir="rtl"]) .form-subtitle,
    :host-context([dir="rtl"]) .checklist-section h4,
    :host-context([dir="rtl"]) .results-count {
      text-align: right;
    }
  `]
})
export class SearchComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  private searchSubject = new Subject<string>();

  readonly guestLimit = 3;
  readonly InvestigationStatus = InvestigationStatus;

  searchQuery = signal('');
  entities = signal<EntitySearchResult[]>([]);
  loading = signal(false);
  hasSearched = signal(false);
  totalCount = signal(0);
  currentPage = signal(1);
  hasNextPage = signal(false);
  showFilters = signal(false);

  // Enquiry state
  checkingExisting = signal(false);
  existingEnquiry = signal<WatchRequest | null>(null);
  alreadySubscribed = signal(false);
  showNewEnquiryForm = signal(false);
  skipExistingCheck = signal(false);
  submittingEnquiry = signal(false);
  subscribing = signal(false);
  slaDays = signal(2);
  directEnquiryMode = signal(false);

  enquiryFormValid = computed(() => {
    return this.enquiryEntityName().trim().length > 0;
  });

  // Toast
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'info'>('success');

  // Enquiry form (entityName as signal for reactive validation)
  enquiryEntityName = signal('');
  enquiryForm = {
    entityCountry: '',
    entityPhone: '',
    entityWeChat: '',
    entityWebsite: '',
    additionalDetails: '',
  };

  checklistItems = [
    { key: 'legitimacy', labelKey: 'enquiry.checkLegitimacy', checked: false },
    { key: 'quality', labelKey: 'enquiry.checkQuality', checked: false },
    { key: 'payment', labelKey: 'enquiry.checkPayment', checked: false },
    { key: 'delivery', labelKey: 'enquiry.checkDelivery', checked: false },
    { key: 'other', labelKey: 'enquiry.checkOther', checked: false },
  ];

  displayedEntities = computed(() => {
    const all = this.entities();
    if (!this.authService.isAuthenticated() && all.length > this.guestLimit) {
      return all.slice(0, this.guestLimit);
    }
    return all;
  });

  isGuestLimited = computed(() => {
    return !this.authService.isAuthenticated() && this.entities().length > this.guestLimit;
  });

  filters = {
    country: '',
    category: '',
    severity: '',
  };

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.performSearch();
      });

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['q']) {
          this.searchQuery.set(params['q']);
          this.performSearch();
        }
        if (params['openEnquiry'] === 'true') {
          this.directEnquiryMode.set(true);
          this.hasSearched.set(true);
          this.showNewEnquiryForm.set(true);
        }
      });

    // Load SLA setting
    this.apiService.get<any>('watch-requests/sla').subscribe({
      next: (res) => { if (res?.value) this.slaDays.set(parseInt(res.value, 10) || 2); },
      error: () => {},
    });
  }

  onSearchInput(query: string): void {
    this.searchSubject.next(query);
  }

  openEnquiryForm(): void {
    this.enquiryEntityName.set(this.searchQuery());
    this.showNewEnquiryForm.set(true);
    this.skipExistingCheck.set(false);
    this.checkExistingEnquiry();
  }

  closeEnquiryPanel(): void {
    this.showNewEnquiryForm.set(false);
    if (this.directEnquiryMode()) {
      this.directEnquiryMode.set(false);
      this.hasSearched.set(false);
    }
  }

  openNewEnquiryForm(): void {
    this.existingEnquiry.set(null);
    this.skipExistingCheck.set(true);
    this.enquiryEntityName.set(this.searchQuery());
  }

  performSearch(): void {
    this.loading.set(true);
    this.hasSearched.set(true);
    // Reset enquiry state on new search
    this.existingEnquiry.set(null);
    this.alreadySubscribed.set(false);
    this.showNewEnquiryForm.set(false);
    this.directEnquiryMode.set(false);

    let url = `entities/search?page=${this.currentPage()}&pageSize=10`;
    if (this.searchQuery()) url += `&q=${encodeURIComponent(this.searchQuery())}`;
    if (this.filters.country) url += `&country=${encodeURIComponent(this.filters.country)}`;
    if (this.filters.category) url += `&productCategory=${encodeURIComponent(this.filters.category)}`;

    this.apiService.get<PaginatedResult<EntitySearchResult>>(url).subscribe({
      next: (result) => {
        if (this.currentPage() === 1) {
          this.entities.set(result.items);
        } else {
          this.entities.update(prev => [...prev, ...result.items]);
        }
        this.totalCount.set(result.totalCount);
        this.hasNextPage.set(result.hasNextPage);
        this.loading.set(false);

        // Reset enquiry panel when new search runs
        if (result.items.length === 0 && result.totalCount === 0) {
          this.showNewEnquiryForm.set(false);
          this.existingEnquiry.set(null);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  loadMore(): void {
    this.currentPage.update(p => p + 1);
    this.performSearch();
  }

  // ===== Enquiry Logic =====

  private checkExistingEnquiry(): void {
    this.checkingExisting.set(true);
    this.enquiryEntityName.set(this.searchQuery());

    this.apiService.get<any>(`watch-requests/check?entityName=${encodeURIComponent(this.searchQuery())}`).subscribe({
      next: (res) => {
        this.checkingExisting.set(false);
        if (res.exists && res.watchRequest) {
          this.existingEnquiry.set(res.watchRequest);
          this.alreadySubscribed.set(res.alreadySubscribed === true);
        } else {
          this.existingEnquiry.set(null);
        }
      },
      error: () => {
        this.checkingExisting.set(false);
        this.existingEnquiry.set(null);
      },
    });
  }

  subscribeToEnquiry(): void {
    const enquiry = this.existingEnquiry();
    if (!enquiry) return;
    this.subscribing.set(true);

    this.apiService.post<any>(`watch-requests/${enquiry.id}/subscribe`, {}).subscribe({
      next: () => {
        this.subscribing.set(false);
        this.alreadySubscribed.set(true);
        this.showToastMessage(this.translate.instant('enquiry.subscribedSuccess'), 'success');
      },
      error: () => {
        this.subscribing.set(false);
        this.alreadySubscribed.set(true); // probably already subscribed
      },
    });
  }

  submitEnquiry(): void {
    if (!this.enquiryEntityName().trim()) return;
    this.submittingEnquiry.set(true);

    const checklist = this.checklistItems
      .filter(i => i.checked)
      .map(i => i.key)
      .join(',');

    this.apiService.post<any>('watch-requests', {
      entityName: this.enquiryEntityName().trim(),
      entityCountry: this.enquiryForm.entityCountry || null,
      entityPhone: this.enquiryForm.entityPhone || null,
      entityWeChat: this.enquiryForm.entityWeChat || null,
      entityWebsite: this.enquiryForm.entityWebsite || null,
      additionalDetails: this.enquiryForm.additionalDetails || null,
      enquiryChecklist: checklist || null,
    }).subscribe({
      next: () => {
        this.submittingEnquiry.set(false);
        const msg = this.translate.instant('enquiry.submittedSuccess', { days: this.slaDays() });
        this.showToastMessage(msg, 'success');
        // Reset form
        this.showNewEnquiryForm.set(false);
        this.enquiryEntityName.set('');
        this.enquiryForm = { entityCountry: '', entityPhone: '', entityWeChat: '', entityWebsite: '', additionalDetails: '' };
        this.checklistItems.forEach(i => i.checked = false);
        // Re-check to show existing enquiry card
        this.checkExistingEnquiry();
      },
      error: () => {
        this.submittingEnquiry.set(false);
        this.showToastMessage(this.translate.instant('enquiry.failedSubmit'), 'info');
      },
    });
  }

  private showToastMessage(message: string, type: 'success' | 'info'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 5000);
  }
}
