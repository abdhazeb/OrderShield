import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { SeverityBadgeComponent } from '../severity-badge/severity-badge.component';
import { Review } from '../../../core/models';
import { ReviewStatus, SeverityLevel } from '../../../core/enums';
import { severitySlug } from '../../../core/utils/severity-label';

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
  /** When true, shows an additional "Hide" (reject) control for admins. */
  showHide = input(false);
  edit = output<Review>();
  remove = output<Review>();
  hide = output<Review>();

  readonly ReviewStatus = ReviewStatus;

  getStatusLabel(): string {
    switch (this.review().status) {
      case ReviewStatus.Published: return 'review.published';
      case ReviewStatus.Rejected: return 'review.rejected';
      case ReviewStatus.Amended: return 'review.amended';
      case ReviewStatus.PendingEdit: return 'review.pendingEdit';
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

  onHide(event: Event): void {
    event.stopPropagation();
    this.hide.emit(this.review());
  }

  /** Slug the severity badge translates; shared so a new severity is labelled everywhere. */
  getSeverityLabel(): string {
    return severitySlug(this.review().severity);
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '';
    return '$' + value.toLocaleString();
  }
}
