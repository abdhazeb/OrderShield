import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
    }
  }
}
