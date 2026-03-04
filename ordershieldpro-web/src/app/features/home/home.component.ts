import { Component, inject, OnInit, signal } from '@angular/core';
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
  template: `
    <div class="home-page">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-bg-pattern"></div>
        <div class="hero-content">
          <div class="hero-badge">
            <svg width="16" height="16" viewBox="0 0 28 28" fill="none"><path d="M14 2L3 7v7c0 7.18 4.69 13.89 11 15.5C20.31 27.89 25 21.18 25 14V7L14 2z" fill="currentColor" opacity="0.4"/><path d="M10 14l3 3 5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>{{ 'home.welcome' | translate }}</span>
          </div>
          <h1 class="hero-heading">{{ 'home.subtitle' | translate }}</h1>
          <div class="hero-search">
            <app-search-bar
              [showFilter]="false"
              [searchTerm]="searchQuery"
              (searchTermChange)="searchQuery = $event"
              (search)="navigateToSearch()"
            />
          </div>
        </div>
      </div>

      <!-- Quick Action -->
      <div class="quick-action">
        <a routerLink="/submit-review" class="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          {{ 'nav.submit' | translate }}
        </a>
      </div>

      <!-- Recent Entities Section -->
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">{{ 'home.recentReviews' | translate }}</h2>
          <a routerLink="/search" class="see-all">{{ 'common.viewAll' | translate }}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>

        @if (loading()) {
          <app-loading-spinner />
        } @else {
          <div class="entities-grid">
            @for (entity of recentEntities(); track entity.id) {
              <app-entity-card [entity]="entity" />
            } @empty {
              <div class="empty-message">{{ 'common.noData' | translate }}</div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .home-page { padding: 0; }

    /* ===== Hero ===== */
    .hero-section {
      background: var(--navy-900);
      padding: 40px 16px 48px;
      text-align: center;
      color: var(--text-on-dark);
      position: relative;
      overflow: hidden;
    }

    .hero-bg-pattern {
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(15, 145, 151, 0.15) 0%, transparent 60%),
        radial-gradient(circle at 20% 80%, rgba(15, 145, 151, 0.06) 0%, transparent 40%);
      pointer-events: none;
    }

    .hero-content {
      position: relative;
      z-index: 1;
      max-width: 640px;
      margin: 0 auto;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(15, 145, 151, 0.15);
      border: 1px solid rgba(15, 145, 151, 0.25);
      color: var(--accent-300);
      padding: 6px 14px;
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
      letter-spacing: 0.02em;
    }

    .hero-heading {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 800;
      line-height: 1.25;
      margin: 0 0 24px;
      letter-spacing: -0.03em;
      color: white;
    }

    .hero-search { max-width: 560px; margin: 0 auto; }

    /* ===== Quick Action ===== */
    .quick-action { padding: 0 16px; margin-top: 20px; margin-bottom: 20px; }

    .btn {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      width: 100%; padding: 14px; border: none; border-radius: var(--radius-lg);
      font-weight: 700; font-size: 15px; cursor: pointer; text-decoration: none;
      font-family: var(--font-body);
      transition: all var(--transition-base);
    }

    .btn-primary {
      background: var(--accent-600);
      color: white;
      box-shadow: 0 2px 8px rgba(13, 115, 119, 0.2);
    }

    .btn-primary:hover {
      background: var(--accent-500);
      transform: translateY(-1px);
      box-shadow: var(--shadow-accent);
    }

    /* ===== Section ===== */
    .section { padding: 0 16px 24px; }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .see-all {
      font-size: 14px;
      color: var(--accent-600);
      font-weight: 600;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      transition: gap var(--transition-fast);
    }

    .see-all:hover {
      gap: 6px;
    }

    .entities-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .empty-message {
      text-align: center;
      padding: 2.5rem;
      color: var(--text-muted);
      font-size: 14px;
    }

    @media (min-width: 768px) {
      .hero-section {
        padding: 56px 32px 64px;
        border-radius: 0 0 var(--radius-xl) var(--radius-xl);
      }
      .hero-heading { font-size: 2.75rem; line-height: 1.15; }
      .hero-badge { font-size: 14px; padding: 7px 18px; }
      .section { padding: 0 0 2rem; }
      .section-header { margin-bottom: 20px; }
      .section-title { font-size: 1.4rem; }
      .quick-action { padding: 0; max-width: 260px; margin: 20px 0 28px; }
      .entities-grid { gap: 16px; }
    }
  `]
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
