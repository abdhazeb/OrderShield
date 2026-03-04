import { Component, inject, signal } from '@angular/core';
import { LanguageService, SupportedLanguage } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  template: `
    <div class="lang-selector">
      <button class="lang-btn" (click)="toggleDropdown($event)">
        {{ getCurrentLabel() }}
      </button>
      @if (isOpen()) {
        <div class="lang-dropdown">
          @for (lang of languageService.languageOptions; track lang.code) {
            <button
              class="lang-option"
              [class.active]="languageService.currentLanguage() === lang.code"
              (click)="selectLanguage(lang.code, $event)">
              <span class="lang-label">{{ lang.label }}</span>
              @if (languageService.currentLanguage() === lang.code) {
                <span class="check">&#10003;</span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .lang-selector {
      position: relative;
      z-index: 1100;
    }

    .lang-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--text-on-dark);
      padding: 5px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      font-family: var(--font-body);
      display: flex;
      align-items: center;
      gap: 3px;
      white-space: nowrap;
      transition: all var(--transition-fast);
    }

    .lang-btn:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    /* Desktop header context — light background */
    :host-context(.desktop-header) .lang-btn {
      background: transparent;
      color: var(--text-secondary);
      border-color: var(--surface-border);
    }

    :host-context(.desktop-header) .lang-btn:hover {
      background: var(--navy-50);
      color: var(--navy-900);
      border-color: var(--navy-200);
    }

    :host-context(.menu-item) .lang-btn {
      background: var(--surface-100);
      color: var(--text-primary);
      border-color: var(--surface-border);
    }

    :host-context(.menu-item) .lang-btn:hover {
      background: var(--surface-200);
    }

    .lang-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      left: auto;
      background: var(--surface-0);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--surface-border-subtle);
      overflow: hidden;
      z-index: 1200;
      min-width: 130px;
      direction: ltr;
      text-align: left;
    }

    :host-context([dir="rtl"]) .lang-dropdown {
      right: auto;
      left: 0;
    }

    .lang-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 9px 14px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-primary);
      transition: background var(--transition-fast);
      font-family: var(--font-body);
      gap: 8px;
    }

    .lang-option:hover {
      background: var(--navy-50);
    }

    .lang-option.active {
      color: var(--accent-600);
      font-weight: 600;
      background: var(--accent-50);
    }

    .lang-label {
      font-weight: 600;
    }

    .check {
      color: var(--accent-600);
      font-size: 11px;
      font-weight: 700;
    }
  `],
  host: {
    '(document:click)': 'onDocumentClick($event)',
  }
})
export class LanguageSelectorComponent {
  languageService = inject(LanguageService);
  isOpen = signal(false);

  getCurrentLabel(): string {
    const current = this.languageService.languageOptions.find(
      l => l.code === this.languageService.currentLanguage()
    );
    return current?.label || 'English';
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isOpen.update(v => !v);
  }

  onDocumentClick(event: Event): void {
    this.isOpen.set(false);
  }

  selectLanguage(code: SupportedLanguage, event: Event): void {
    event.stopPropagation();
    this.languageService.setLanguage(code);
    this.isOpen.set(false);
  }
}
