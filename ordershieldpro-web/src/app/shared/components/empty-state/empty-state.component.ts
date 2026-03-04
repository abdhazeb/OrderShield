import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="empty-state">
      <div class="empty-icon">{{ icon }}</div>
      <div class="empty-title">{{ title }}</div>
      @if (subtitle) {
        <div class="empty-subtitle">{{ subtitle }}</div>
      }
      @if (actionLabel) {
        <button class="empty-action" (click)="action.emit()">{{ actionLabel }}</button>
      }
    </div>
  `,
  styles: [`
    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 8px;
      font-family: var(--font-display);
    }

    .empty-subtitle {
      font-size: 14px;
      color: var(--text-tertiary);
      margin-bottom: 20px;
    }

    .empty-action {
      background: var(--accent-600);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: background var(--transition-fast);
      font-family: var(--font-body);
    }

    .empty-action:hover {
      background: var(--accent-500);
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon = '📭';
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() actionLabel?: string;
  @Output() action = new EventEmitter<void>();
}
