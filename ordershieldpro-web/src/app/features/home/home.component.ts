import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EntityCardComponent } from '../../shared/components/entity-card/entity-card.component';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ApiService } from '../../core/services/api.service';
import { EntitySearchResult, PaginatedResult } from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    TranslateModule,
    EntityCardComponent,
    SearchBarComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  recentEntities = signal<EntitySearchResult[]>([]);
  loading = signal(true);
  searchQuery = '';

  // Filters can be set here so the user can narrow results before ever leaving the
  // home page — mirrors the filter fields on the search page, which reads these back
  // out of the query params this navigation sets.
  showFilters = signal(false);
  filters = {
    country: '',
    category: '',
    severity: '',
  };

  ngOnInit(): void {
    this.loadRecentEntities();
  }

  private loadRecentEntities(): void {
    this.loading.set(true);
    this.apiService
      .get<PaginatedResult<EntitySearchResult>>('entities/search?page=1&pageSize=5')
      .subscribe({
        next: (result) => {
          this.recentEntities.set(result.items);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  navigateToSearch(): void {
    const queryParams: Record<string, string> = {};
    if (this.searchQuery.trim()) queryParams['q'] = this.searchQuery.trim();
    if (this.filters.country.trim()) queryParams['country'] = this.filters.country.trim();
    if (this.filters.category.trim()) queryParams['category'] = this.filters.category.trim();
    if (this.filters.severity !== '') queryParams['severity'] = this.filters.severity;

    // Nothing entered at all — fall back to "View All" rather than doing nothing.
    if (Object.keys(queryParams).length === 0) {
      queryParams['initial'] = 'true';
    }

    this.router.navigate(['/search'], { queryParams });
  }
}
