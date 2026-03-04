import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="spinner-container">
      <div class="spinner"></div>
      @if (message) {
        <div class="spinner-message">{{ message }}</div>
      }
    </div>
  `,
  styles: [`
    .spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 1rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--surface-200);
      border-top-color: var(--accent-500);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-message {
      color: var(--text-tertiary);
      font-size: 14px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() message?: string;
}
