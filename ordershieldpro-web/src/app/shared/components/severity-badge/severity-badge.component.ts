import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-severity-badge',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <span class="badge" [class]="'badge-' + severity">
      {{ 'severity.' + severity | translate }}
      @if (count !== undefined) {
        <span class="count">{{ count }}</span>
      }
    </span>
  `,
  styles: [`
    .badge {
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      letter-spacing: 0.01em;
    }

    .badge-info {
      background: #e8f0fe;
      color: #1a56db;
    }

    .badge-warning {
      background: #fef0cd;
      color: #8a5a00;
    }

    .badge-critical {
      background: #fde8e8;
      color: #b91c1c;
    }

    .badge-behavior {
      background: #f0e5ff;
      color: #6b21a8;
    }

    .badge-fraud {
      background: #fce7f3;
      color: #9d174d;
    }

    .badge-quality {
      background: #d5f5f4;
      color: #0d7377;
    }

    .badge-delivery {
      background: #e0e7ff;
      color: #3730a3;
    }

    .badge-payment {
      background: #fef3c7;
      color: #92400e;
    }

    .count {
      font-weight: 800;
    }
  `]
})
export class SeverityBadgeComponent {
  @Input({ required: true }) severity!: string;
  @Input() count?: number;
}
