import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  template: `
    <div class="stat-card">
      <div class="stat-value" [style.color]="color">{{ value }}</div>
      <div class="stat-label">{{ label }}</div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: var(--surface-0);
      padding: 16px;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xs);
      border: 1px solid var(--surface-border-subtle);
      text-align: center;
      transition: all var(--transition-base);
    }
    .stat-card:hover { box-shadow: var(--shadow-sm); }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--navy-900);
      margin-bottom: 4px;
      font-family: var(--font-display);
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-tertiary);
    }
  `]
})
export class StatCardComponent {
  @Input({ required: true }) value!: string | number;
  @Input({ required: true }) label!: string;
  @Input() color = 'var(--navy-900)';
}
