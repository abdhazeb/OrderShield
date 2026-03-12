import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  template: `
    <div class="search-bar">
      <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        type="text"
        [placeholder]="placeholder || ('search.placeholder' | translate)"
        [(ngModel)]="searchTerm"
        (input)="onInput()"
        (keyup.enter)="onSearch()"
      />
      @if (showFilter) {
        <button class="filter-btn" (click)="filterClick.emit()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        </button>
      }
    </div>
  `,
  styles: [`
    .search-bar {
      background: var(--surface-0);
      border-radius: var(--radius-lg);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border: 1.5px solid var(--surface-border);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    .search-bar:focus-within {
      border-color: var(--accent-400);
      box-shadow: 0 0 0 3px rgba(15, 145, 151, 0.1);
    }

    .search-icon {
      color: var(--text-muted);
      flex-shrink: 0;
    }

    input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 15px;
      font-family: var(--font-body);
      background: transparent;
      color: var(--text-primary);
    }

    input::placeholder {
      color: var(--text-muted);
    }

    .filter-btn {
      background: var(--surface-100);
      border: 1px solid var(--surface-border);
      width: 34px;
      height: 34px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      cursor: pointer;
      flex-shrink: 0;
      transition: all var(--transition-fast);
    }

    .filter-btn:hover {
      background: var(--surface-200);
      color: var(--text-primary);
    }

    /* RTL */
    :host-context([dir="rtl"]) input {
      text-align: right;
    }
  `]
})
export class SearchBarComponent {
  @Input() placeholder?: string;
  @Input() showFilter = true;
  @Input() searchTerm = '';
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();
  @Output() filterClick = new EventEmitter<void>();

  onInput(): void {
    this.searchTermChange.emit(this.searchTerm);
  }

  onSearch(): void {
    this.search.emit(this.searchTerm);
  }
}
