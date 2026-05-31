import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export type ConfirmDialogVariant = 'info' | 'warning' | 'danger' | 'success' | 'question';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual style of the dialog. Falls back to legacy `color` value. */
  variant?: ConfirmDialogVariant;
  /** Hide the cancel button (use as a simple alert). */
  alertOnly?: boolean;
  /** @deprecated use `variant` */
  color?: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="osp-dialog" [attr.data-variant]="variant()">
      <div class="osp-dialog__icon" aria-hidden="true">
        <span class="osp-dialog__icon-glyph">{{ iconGlyph() }}</span>
      </div>

      <div class="osp-dialog__body">
        <h2 class="osp-dialog__title">{{ data.title }}</h2>
        <p class="osp-dialog__message">{{ data.message }}</p>
      </div>

      <div class="osp-dialog__actions">
        @if (!data.alertOnly) {
          <button type="button"
                  class="osp-dialog__btn osp-dialog__btn--ghost"
                  (click)="dialogRef.close(false)">
            {{ data.cancelLabel || 'Cancel' }}
          </button>
        }
        <button type="button"
                class="osp-dialog__btn osp-dialog__btn--primary"
                cdkFocusInitial
                (click)="dialogRef.close(true)">
          {{ data.confirmLabel || 'OK' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .osp-dialog {
      display: grid;
      grid-template-columns: 56px 1fr;
      grid-template-rows: auto auto;
      gap: 14px 18px;
      padding: 4px 4px 0;
      font-family: var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif);
      min-width: 320px;
      max-width: 460px;
    }

    /* Icon bubble */
    .osp-dialog__icon {
      grid-column: 1; grid-row: 1;
      width: 48px; height: 48px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: var(--accent-50, #e6f4f5);
      color: var(--accent-600, #0d7377);
      flex-shrink: 0;
    }
    .osp-dialog__icon-glyph {
      font-size: 26px; line-height: 1; font-weight: 700;
    }

    .osp-dialog[data-variant="warning"] .osp-dialog__icon { background: #fef3c7; color: #b45309; }
    .osp-dialog[data-variant="danger"]  .osp-dialog__icon { background: #fee2e2; color: #b91c1c; }
    .osp-dialog[data-variant="success"] .osp-dialog__icon { background: #dcfce7; color: #15803d; }
    .osp-dialog[data-variant="info"]    .osp-dialog__icon { background: #dbeafe; color: #1d4ed8; }
    .osp-dialog[data-variant="question"] .osp-dialog__icon { background: var(--accent-50, #e6f4f5); color: var(--accent-600, #0d7377); }

    /* Body */
    .osp-dialog__body { grid-column: 2; grid-row: 1; min-width: 0; }
    .osp-dialog__title {
      font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
      font-size: 18px; font-weight: 700; margin: 0 0 6px;
      color: var(--text-primary, #0f172a); letter-spacing: -0.01em;
    }
    .osp-dialog__message {
      margin: 0; font-size: 14.5px; line-height: 1.55;
      color: var(--text-secondary, #475569);
      word-wrap: break-word;
    }

    /* Actions */
    .osp-dialog__actions {
      grid-column: 1 / -1; grid-row: 2;
      display: flex; justify-content: flex-end; gap: 10px;
      padding-top: 18px; margin-top: 4px;
      border-top: 1px solid var(--surface-border, #e2e8f0);
    }
    .osp-dialog__btn {
      min-width: 96px;
      padding: 10px 18px;
      border-radius: 10px;
      font-family: inherit; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all .15s ease;
      border: 1px solid transparent;
    }
    .osp-dialog__btn--ghost {
      background: transparent;
      color: var(--text-secondary, #475569);
      border-color: var(--surface-border, #e2e8f0);
    }
    .osp-dialog__btn--ghost:hover {
      background: #f1f5f9;
      color: var(--text-primary, #0f172a);
    }
    .osp-dialog__btn--primary {
      background: var(--accent-600, #0d7377);
      color: #fff;
      box-shadow: 0 2px 8px rgba(13, 115, 119, 0.18);
    }
    .osp-dialog__btn--primary:hover { background: var(--accent-500, #0f9197); }
    .osp-dialog__btn--primary:focus-visible { outline: 3px solid rgba(15,145,151,0.3); outline-offset: 2px; }

    .osp-dialog[data-variant="danger"]  .osp-dialog__btn--primary { background: #dc2626; box-shadow: 0 2px 8px rgba(220,38,38,0.2); }
    .osp-dialog[data-variant="danger"]  .osp-dialog__btn--primary:hover { background: #b91c1c; }
    .osp-dialog[data-variant="warning"] .osp-dialog__btn--primary { background: #d97706; box-shadow: 0 2px 8px rgba(217,119,6,0.2); }
    .osp-dialog[data-variant="warning"] .osp-dialog__btn--primary:hover { background: #b45309; }

    /* RTL: mirror layout (icon on the right, actions on the left) */
    :host-context([dir="rtl"]) .osp-dialog {
      grid-template-columns: 1fr 56px;
    }
    :host-context([dir="rtl"]) .osp-dialog__icon { grid-column: 2; }
    :host-context([dir="rtl"]) .osp-dialog__body { grid-column: 1; text-align: right; }
    :host-context([dir="rtl"]) .osp-dialog__actions { justify-content: flex-start; flex-direction: row-reverse; }
  `]
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  variant = computed<ConfirmDialogVariant>(() => {
    if (this.data.variant) return this.data.variant;
    if (this.data.color === 'warn') return 'danger';
    return 'question';
  });

  iconGlyph = computed<string>(() => {
    switch (this.variant()) {
      case 'warning':  return '!';
      case 'danger':   return '!';
      case 'success':  return '\u2713'; // ✓
      case 'info':     return 'i';
      case 'question':
      default:         return '?';
    }
  });
}
