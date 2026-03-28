import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Observable, map } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);

  confirm(options: {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    color?: 'primary' | 'warn';
  }): Observable<boolean> {
    const data: ConfirmDialogData = {
      title: options.title || this.translate.instant('common.confirm'),
      message: options.message,
      confirmLabel: options.confirmLabel || this.translate.instant('common.yes'),
      cancelLabel: options.cancelLabel || this.translate.instant('common.cancel'),
      color: options.color || 'primary',
    };

    return this.dialog
      .open(ConfirmDialogComponent, { data, width: '400px', autoFocus: false })
      .afterClosed()
      .pipe(map(result => result === true));
  }
}
