import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  color?: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">{{ data.cancelLabel || 'Cancel' }}</button>
      <button mat-flat-button [color]="data.color || 'primary'" (click)="dialogRef.close(true)">{{ data.confirmLabel || 'Confirm' }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { font-family: var(--font-display, 'Bricolage Grotesque', sans-serif); margin: 0; }
    p { color: var(--text-secondary, #555); margin: 8px 0 0; line-height: 1.5; }
    mat-dialog-actions { padding: 12px 0 0; }
  `]
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
}
