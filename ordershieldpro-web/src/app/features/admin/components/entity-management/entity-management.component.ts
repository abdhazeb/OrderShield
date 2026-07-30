import { Component, inject, signal, computed, OnInit, output, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { EntitySearchResult, PaginatedResult } from '../../../../core/models';
import { EntityType, VerificationStatus } from '../../../../core/enums';
import { LocalizeValuePipe } from '../../../../shared/pipes/localize-value.pipe';

/**
 * Admin → Entities → All Entities. The directory as moderators need to work with it:
 * hidden entities included (the public search still filters them out — the backend only
 * honours `includeHidden` for moderators), with the same hide/delete rules the entity
 * profile enforces. Row click opens the full profile, which is where editing happens —
 * duplicating the edit form here would mean two places to keep in step.
 */
@Component({
  selector: 'app-entity-management',
  standalone: true,
  imports: [DatePipe, FormsModule, TranslateModule, LoadingSpinnerComponent, EmptyStateComponent, LocalizeValuePipe],
  templateUrl: './entity-management.component.html',
  styleUrl: './entity-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityManagementComponent implements OnInit {
  private apiService = inject(ApiService);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private router = inject(Router);

  /** Total number of entities, for the tab's count chip. */
  countChange = output<number>();

  readonly pageSize = 25;

  entities = signal<EntitySearchResult[]>([]);
  loading = signal(false);
  processingId = signal<string | null>(null);

  page = signal(1);
  totalCount = signal(0);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize)));

  searchTerm = '';
  countryFilter = '';
  /**
   * Visibility is the filter that matters here — it is the one axis the public directory
   * cannot show. Entity type is deliberately absent: both types render as "Vendor" in the
   * UI, so filtering on it would offer a distinction users never see.
   */
  visibilityFilter = signal<'all' | 'visible' | 'hidden'>('all');

  private searchInput$ = new Subject<string>();

  constructor() {
    // Typing in the search box should not fire a request per keystroke.
    this.searchInput$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload());
  }

  ngOnInit(): void {
    this.load();
  }

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.searchInput$.next(value);
  }

  onFilterChange(): void {
    this.reload();
  }

  /** Any filter change resets to page 1 — staying on page 7 of a new result set is noise. */
  private reload(): void {
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  private load(): void {
    this.loading.set(true);

    const params = new URLSearchParams();
    params.set('page', String(this.page()));
    params.set('pageSize', String(this.pageSize));
    params.set('sortBy', 'name');
    // Hidden entities are part of what an admin manages here; the visibility filter then
    // narrows client-side rather than costing a second round trip.
    params.set('includeHidden', 'true');
    if (this.searchTerm.trim()) params.set('q', this.searchTerm.trim());
    if (this.countryFilter.trim()) params.set('country', this.countryFilter.trim());

    this.apiService
      .get<PaginatedResult<EntitySearchResult>>(`entities/search?${params.toString()}`)
      .subscribe({
        next: (res) => {
          this.entities.set(res.items || []);
          this.totalCount.set(res.totalCount ?? 0);
          this.countChange.emit(res.totalCount ?? 0);
          this.loading.set(false);
        },
        error: () => {
          this.entities.set([]);
          this.loading.set(false);
          this.toast.error(this.translate.instant('admin.entityManagement.loadFailed'));
        },
      });
  }

  visibleEntities = computed(() => {
    const filter = this.visibilityFilter();
    if (filter === 'all') return this.entities();
    const wantHidden = filter === 'hidden';
    return this.entities().filter(e => !!e.isHidden === wantHidden);
  });

  openEntity(entity: EntitySearchResult): void {
    this.router.navigate(['/entity', entity.id]);
  }

  /** Editing lives on the entity profile — this is the shortcut into it. */
  editEntity(entity: EntitySearchResult, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/entity', entity.id], { queryParams: { edit: 'true' } });
  }

  toggleVisibility(entity: EntitySearchResult, event: Event): void {
    event.stopPropagation();
    if (this.processingId()) return;

    const hiding = !entity.isHidden;
    const message = this.translate.instant(hiding ? 'entity.hideConfirm' : 'entity.unhideConfirm');

    this.confirmService.confirm({ message, color: hiding ? 'warn' : 'primary' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.processingId.set(entity.id);
      this.apiService.put(`entities/${entity.id}/visibility`, { isHidden: hiding }).subscribe({
        next: () => {
          this.processingId.set(null);
          this.entities.update(list =>
            list.map(e => (e.id === entity.id ? { ...e, isHidden: hiding } : e))
          );
          this.toast.success(
            this.translate.instant(hiding ? 'entity.hideSuccess' : 'entity.unhideSuccess')
          );
        },
        error: () => {
          this.processingId.set(null);
          this.toast.error(
            this.translate.instant(hiding ? 'entity.hideFailed' : 'entity.unhideFailed')
          );
        },
      });
    });
  }

  /**
   * The API refuses deletion while any review still references the entity and explains
   * why; that message is surfaced verbatim rather than replaced with a generic failure.
   */
  deleteEntity(entity: EntitySearchResult, event: Event): void {
    event.stopPropagation();
    if (this.processingId()) return;

    const message = this.translate.instant('entity.deleteConfirm', { name: entity.legalName });
    this.confirmService.confirm({ message, color: 'warn' }).subscribe(confirmed => {
      if (!confirmed) return;
      this.processingId.set(entity.id);
      this.apiService.delete(`entities/${entity.id}`).subscribe({
        next: () => {
          this.processingId.set(null);
          this.entities.update(list => list.filter(e => e.id !== entity.id));
          this.totalCount.update(c => Math.max(0, c - 1));
          this.countChange.emit(this.totalCount());
          this.toast.success(this.translate.instant('entity.deleteSuccess'));
        },
        error: (err) => {
          this.processingId.set(null);
          const errors = err?.error?.errors;
          this.toast.error(
            Array.isArray(errors) && errors.length
              ? errors.join(' ')
              : this.translate.instant('entity.deleteFailed')
          );
        },
      });
    });
  }

  entityTypeKey(type: EntityType): string {
    return type === EntityType.Broker ? 'entity.broker' : 'entity.supplier';
  }

  isVerified(entity: EntitySearchResult): boolean {
    return entity.verificationStatus === VerificationStatus.Verified;
  }
}
