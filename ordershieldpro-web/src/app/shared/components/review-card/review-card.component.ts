import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { SeverityBadgeComponent } from '../severity-badge/severity-badge.component';
import { Review } from '../../../core/models';
import { ReviewStatus, SeverityLevel } from '../../../core/enums';

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
  /** When true, shows edit/delete controls (used in the user's own reviews list). */
  editable = input(false);
  edit = output<Review>();
  remove = output<Review>();

  readonly ReviewStatus = ReviewStatus;

  getStatusLabel(): string {
    switch (this.review().status) {
      case ReviewStatus.Published: return 'review.published';
      case ReviewStatus.Rejected: return 'review.rejected';
      case ReviewStatus.Amended: return 'review.amended';
      default: return 'review.pending';
    }
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit(this.review());
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.remove.emit(this.review());
  }

  getSeverityLabel(): string {
    switch (this.review().severity) {
      case SeverityLevel.Critical: return 'critical';
      case SeverityLevel.Warning: return 'warning';
      case SeverityLevel.Behavior: return 'behavior';
      case SeverityLevel.Fraud: return 'fraud';
      case SeverityLevel.Quality: return 'quality';
      case SeverityLevel.Delivery: return 'delivery';
      case SeverityLevel.Payment: return 'payment';
      case SeverityLevel.FinanciallyDistressed: return 'financiallyDistressed';
      case SeverityLevel.Bankrupt: return 'bankrupt';
      case SeverityLevel.PoorManagement: return 'poorManagement';
      case SeverityLevel.InaccurateAppointments: return 'inaccurateAppointments';
      case SeverityLevel.BribeOthers: return 'bribeOthers';
      case SeverityLevel.FakeSupplier: return 'fakeSupplier';
      case SeverityLevel.Other: return 'other';
      case SeverityLevel.Positive: return 'positive';
      case SeverityLevel.Recommended: return 'recommended';
      case SeverityLevel.HighQuality: return 'highQuality';
      case SeverityLevel.OnTimeDelivery: return 'onTimeDelivery';
      case SeverityLevel.GoodCommunication: return 'goodCommunication';
      case SeverityLevel.Reliable: return 'reliable';
      default: return 'info';
    }
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '';
    return '$' + value.toLocaleString();
  }
}
