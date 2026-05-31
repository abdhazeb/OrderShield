import {
  Component,
  ChangeDetectionStrategy,
  forwardRef,
  signal,
  input,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

/**
 * Reusable password input with show/hide eye toggle.
 * Implements ControlValueAccessor so it works with reactive forms via formControlName.
 */
@Component({
  selector: 'app-password-input',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="pw-wrap" [class.pw-disabled]="disabled()">
      <input
        class="pw-input"
        [type]="visible() ? 'text' : 'password'"
        [placeholder]="placeholder()"
        [attr.autocomplete]="autocomplete()"
        [attr.aria-label]="ariaLabel() || ('auth.password' | translate)"
        [disabled]="disabled()"
        [ngModel]="value"
        (ngModelChange)="onModelChange($event)"
        (blur)="onBlur()"
      />
      <button
        type="button"
        class="pw-toggle"
        tabindex="-1"
        (click)="toggle()"
        [attr.aria-pressed]="visible()"
        [attr.aria-label]="(visible() ? 'auth.hidePassword' : 'auth.showPassword') | translate"
        [title]="(visible() ? 'auth.hidePassword' : 'auth.showPassword') | translate"
      >
        <!-- eye / eye-off SVG -->
        @if (visible()) {
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.55 19.55 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.6 19.6 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        } @else {
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        }
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .pw-wrap {
      position: relative;
      display: flex;
      align-items: stretch;
      width: 100%;
    }
    .pw-input {
      width: 100%;
      padding: 11px 44px 11px 11px;   /* extra room for the toggle on the inline-end side */
      border: 1.5px solid var(--surface-border, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      font-size: 15px;
      font-family: var(--font-body, inherit);
      background: var(--surface-0, #fff);
      color: var(--text-primary, #0f172a);
      box-sizing: border-box;
      transition: border-color .15s, box-shadow .15s;
    }
    .pw-input:focus {
      outline: none;
      border-color: var(--accent-400, #14b8b8);
      box-shadow: 0 0 0 3px rgba(15, 145, 151, 0.10);
    }
    .pw-toggle {
      position: absolute;
      top: 50%;
      inset-inline-end: 6px;
      transform: translateY(-50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px; height: 34px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text-tertiary, #64748b);
      cursor: pointer;
      transition: background .15s, color .15s;
    }
    .pw-toggle:hover { background: rgba(15, 145, 151, 0.08); color: var(--accent-600, #0d7377); }
    .pw-toggle:focus-visible { outline: 2px solid var(--accent-400, #14b8b8); outline-offset: 1px; }

    .pw-disabled .pw-input { background: #f8fafc; cursor: not-allowed; opacity: .7; }
    .pw-disabled .pw-toggle { display: none; }

    /* RTL: keep input text alignment consistent */
    :host-context([dir="rtl"]) .pw-input { text-align: right; direction: rtl; }
  `],
})
export class PasswordInputComponent implements ControlValueAccessor {
  private translate = inject(TranslateService);

  placeholder = input<string>('');
  autocomplete = input<string>('current-password');
  ariaLabel = input<string>('');

  visible = signal(false);
  disabled = signal(false);
  value = '';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  toggle(): void {
    this.visible.update(v => !v);
  }

  // ControlValueAccessor
  writeValue(value: string): void {
    this.value = value ?? '';
  }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

  onModelChange(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  onBlur(): void {
    this.onTouched();
  }
}
