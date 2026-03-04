import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SeverityBadgeComponent } from '../severity-badge/severity-badge.component';
import { EntitySearchResult } from '../../../core/models';
import { VerificationStatus } from '../../../core/enums';

@Component({
  selector: 'app-entity-card',
  standalone: true,
  imports: [RouterLink, TranslateModule, SeverityBadgeComponent],
  template: `
    <div class="entity-card" [routerLink]="['/entity', entity.id]">
      <div class="entity-header">
        <div>
          <div class="entity-name">{{ entity.legalName }}</div>
          @if (entity.tradeName && entity.tradeName !== entity.legalName) {
            <div class="entity-trade-name">{{ entity.tradeName }}</div>
          }
        </div>
      </div>
      <div class="entity-meta">
        @if (entity.country) {
          <span class="meta-item">📍 {{ entity.country }}</span>
        }
        @if (entity.productCategories) {
          <span class="meta-item">📦 {{ entity.productCategories }}</span>
        }
      </div>
      <div class="entity-stats">
        @if (isVerified) {
          <span class="badge badge-verified">✓ {{ 'verification.verified' | translate }}</span>
        }
        @if (entity.infoReviewCount > 0) {
          <app-severity-badge severity="info" [count]="entity.infoReviewCount" />
        }
        @if (entity.warningReviewCount > 0) {
          <app-severity-badge severity="warning" [count]="entity.warningReviewCount" />
        }
        @if (entity.criticalReviewCount > 0) {
          <app-severity-badge severity="critical" [count]="entity.criticalReviewCount" />
        }
      </div>
    </div>
  `,
  styles: [`
    .entity-card {
      background: var(--surface-0);
      border-radius: var(--radius-lg);
      padding: 16px;
      border: 1px solid var(--surface-border-subtle);
      cursor: pointer;
      transition: border-color var(--transition-base), box-shadow var(--transition-base), transform var(--transition-base);
      position: relative;
    }

    .entity-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 12px;
      bottom: 12px;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: var(--accent-400);
      opacity: 0;
      transition: opacity var(--transition-base);
    }

    [dir="rtl"] .entity-card::before {
      left: auto;
      right: 0;
      border-radius: 3px 0 0 3px;
    }

    .entity-card:hover {
      border-color: var(--accent-200);
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .entity-card:hover::before {
      opacity: 1;
    }

    .entity-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 10px;
    }

    .entity-name {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.3;
      letter-spacing: -0.01em;
    }

    .entity-trade-name {
      font-size: 13px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }

    .entity-type-badge {
      background: var(--accent-100);
      color: var(--accent-600);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-left: 8px;
      white-space: nowrap;
      letter-spacing: 0.03em;
    }

    .entity-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 13px;
      color: var(--text-tertiary);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .entity-stats {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge {
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .badge-verified {
      background: var(--success-bg);
      color: var(--success);
    }

    @media (min-width: 768px) {
      .entity-card {
        padding: 1.25rem 1.5rem;
      }
      .entity-name {
        font-size: 1.15rem;
      }
      .entity-meta {
        gap: 1.5rem;
        font-size: 0.875rem;
      }
    }
  `]
})
export class EntityCardComponent {
  @Input({ required: true }) entity!: EntitySearchResult;

  get isVerified(): boolean {
    return this.entity.verificationStatus === VerificationStatus.Verified;
  }
}
