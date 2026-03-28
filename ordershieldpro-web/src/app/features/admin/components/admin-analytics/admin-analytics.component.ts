import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../../../core/services/api.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AnalyticsSummary } from '../../../../core/models';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [DecimalPipe, TranslateModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './admin-analytics.component.html',
  styleUrl: './admin-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminAnalyticsComponent implements OnInit {
  private apiService = inject(ApiService);

  analytics = signal<AnalyticsSummary | null>(null);
  loadingAnalytics = signal(false);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  private loadAnalytics(): void {
    this.loadingAnalytics.set(true);
    this.apiService.get<AnalyticsSummary>('admin/analytics').subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.loadingAnalytics.set(false);
      },
      error: () => {
        this.loadingAnalytics.set(false);
        this.analytics.set(null);
      }
    });
  }
}
