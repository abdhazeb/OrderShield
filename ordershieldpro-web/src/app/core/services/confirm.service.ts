import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Observable, map } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData, ConfirmDialogVariant } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { LanguageService } from './language.service';

interface BaseDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  /** @deprecated use `variant` */
  color?: 'primary' | 'warn';
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);
  private languageService = inject(LanguageService);

  /** Show a confirm dialog with Cancel + Confirm buttons. */
  confirm(options: BaseDialogOptions): Observable<boolean> {
    return this.open({ ...options, alertOnly: false });
  }

  /** Show a non-cancellable alert dialog. */
  alert(options: Omit<BaseDialogOptions, 'cancelLabel'>): Observable<boolean> {
    return this.open({
      ...options,
      alertOnly: true,
      confirmLabel: options.confirmLabel || this.translate.instant('common.dismiss'),
    });
  }

  private open(options: BaseDialogOptions & { alertOnly: boolean }): Observable<boolean> {
    const data: ConfirmDialogData = {
      title: options.title || this.translate.instant(options.alertOnly ? 'common.notice' : 'common.confirm'),
      message: options.message,
      confirmLabel: options.confirmLabel || this.translate.instant(options.alertOnly ? 'common.dismiss' : 'common.yes'),
      cancelLabel: options.cancelLabel || this.translate.instant('common.cancel'),
      variant: options.variant,
      color: options.color,
      alertOnly: options.alertOnly,
    };

    return this.dialog
      .open(ConfirmDialogComponent, {
        data,
        width: '440px',
        maxWidth: '92vw',
        autoFocus: false,
        restoreFocus: true,
        direction: this.languageService.getDirection(),
        panelClass: 'osp-dialog-panel',
        backdropClass: 'osp-dialog-backdrop',
      })
      .afterClosed()
      .pipe(map(result => result === true));
  }
}
