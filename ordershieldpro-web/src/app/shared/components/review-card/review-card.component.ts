import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { SeverityBadgeComponent } from '../severity-badge/severity-badge.component';
import { Review } from '../../../core/models';
import { SeverityLevel } from '../../../core/enums';

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [TranslateModule, DatePipe, SlicePipe, SeverityBadgeComponent],
  templateUrl: './review-card.component.html',
  styleUrl: './review-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewCardComponent {
  review = input.required<Review>();

  getSeverityLabel(): string {
    switch (this.review().severity) {
      case SeverityLevel.Critical: return 'critical';
      case SeverityLevel.Warning: return 'warning';
      case SeverityLevel.Behavior: return 'behavior';
      case SeverityLevel.Fraud: return 'fraud';
      case SeverityLevel.Quality: return 'quality';
      case SeverityLevel.Delivery: return 'delivery';
      case SeverityLevel.Payment: return 'payment';
      default: return 'info';
    }
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '';
    return '$' + value.toLocaleString();
  }
}
