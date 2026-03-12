import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { SeverityBadgeComponent } from '../severity-badge/severity-badge.component';
import { Review } from '../../../core/models';
import { SeverityLevel } from '../../../core/enums';

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [TranslateModule, DatePipe, SlicePipe, SeverityBadgeComponent],
  template: `
    <div class="review-item">
      <div class="review-header">
        <app-severity-badge [severity]="getSeverityLabel()" />
        <span class="review-date">{{ review.createdAt | date:'mediumDate' }}</span>
      </div>
      <div class="review-title">{{ review.title }}</div>
      <div class="review-content">{{ review.narrative | slice:0:200 }}{{ review.narrative.length > 200 ? '...' : '' }}</div>
      <div class="review-meta">
        @if (review.product) {
          <span>📦 {{ review.product }}</span>
        }
        @if (review.orderValue) {
          <span>💰 {{ formatCurrency(review.orderValue) }}</span>
        }
        @if (review.incidentDate) {
          <span>📅 {{ review.incidentDate | date:'mediumDate' }}</span>
        }
        <span>👤 {{ review.reviewerType }} · {{ review.transactionRole }}</span>
      </div>

      @for (note of review.evidenceNotes; track note.id) {
        @if (note.isPubliclyVisible) {
          <div class="clarification-box">
            <div class="clarification-title">⚡ {{ 'review.clarification' | translate }}</div>
            <div>{{ note.summary }}</div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .review-item {
      background: var(--surface-0);
      border-radius: var(--radius-lg);
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: var(--shadow-xs);
      border: 1px solid var(--surface-border-subtle);
      transition: all var(--transition-base);
    }
    .review-card:hover { box-shadow: var(--shadow-sm); }

    .review-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 10px;
    }

    .review-date {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .review-title {
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 8px;
      font-size: 15px;
      line-height: 1.4;
    }

    .review-content {
      color: var(--text-secondary);
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .review-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: var(--text-tertiary);
      padding-top: 12px;
      border-top: 1px solid var(--surface-border);
    }

    .clarification-box {
      background: #fef3c7;
      border-inline-start: 3px solid #f59e0b;
      padding: 12px;
      margin-top: 12px;
      border-radius: 8px;
      font-size: 13px;
    }

    .clarification-title {
      font-weight: 700;
      color: #92400e;
      margin-bottom: 6px;
    }

    @media (min-width: 768px) {
      .review-item {
        padding: 1.5rem;
      }
      .review-meta {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 1rem;
      }
    }

    /* ===== RTL overrides ===== */
    :host-context([dir="rtl"]) .review-header {
      flex-direction: row-reverse;
    }
    :host-context([dir="rtl"]) .review-title,
    :host-context([dir="rtl"]) .review-content {
      text-align: right;
    }
    :host-context([dir="rtl"]) .review-meta {
      text-align: right;
    }
    @media (min-width: 768px) {
      :host-context([dir="rtl"]) .review-meta {
        flex-direction: row-reverse;
      }
    }
  `]
})
export class ReviewCardComponent {
  @Input({ required: true }) review!: Review;

  getSeverityLabel(): string {
    switch (this.review.severity) {
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
