import { Component, inject, OnInit, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
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
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
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
    this.apiService.get<{ value: string }>('watch-requests/sla').subscribe({
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

    this.apiService.get<{ exists: boolean; watchRequest: WatchRequest; alreadySubscribed: boolean }>(`watch-requests/check?entityName=${encodeURIComponent(this.searchQuery())}`).subscribe({
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
