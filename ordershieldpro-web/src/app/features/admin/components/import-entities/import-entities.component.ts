import { Component, inject, signal, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EntityImportResult } from '../../../../core/models';

/**
 * Bulk-imports trade entities from a spreadsheet upload. The backend auto-detects which
 * of the two known export formats (Cantoon or Qicha/企查查) the file is in — this
 * component only handles the upload and displays the resulting summary.
 */
@Component({
  selector: 'app-import-entities',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './import-entities.component.html',
  styleUrl: './import-entities.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportEntitiesComponent {
  private apiService = inject(ApiService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  uploading = signal(false);
  lastFileName = signal<string | null>(null);
  result = signal<EntityImportResult | null>(null);

  triggerFilePicker(): void {
    if (this.uploading()) return;
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file name later
    if (!file) return;

    this.uploading.set(true);
    this.result.set(null);
    this.lastFileName.set(file.name);

    this.apiService.upload<EntityImportResult>('entities/import', file).subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.result.set(res);
        this.toast.success(
          this.translate.instant('admin.importSuccess', { count: res.created })
        );
      },
      error: (err) => {
        this.uploading.set(false);
        const errors = err?.error?.errors;
        this.toast.error(
          Array.isArray(errors) && errors.length
            ? errors.join(' ')
            : this.translate.instant('admin.importFailed')
        );
      },
    });
  }
}
