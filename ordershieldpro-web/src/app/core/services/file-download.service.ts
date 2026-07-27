import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';

/**
 * Downloads files from protected API endpoints. The bearer token cannot ride on a plain
 * anchor href, so files are fetched as blobs through HttpClient and handed to the browser
 * via a short-lived object URL.
 */
@Injectable({ providedIn: 'root' })
export class FileDownloadService {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  download(path: string, fileName: string): void {
    this.api.download(path).subscribe({
      next: (blob) => this.saveBlob(blob, fileName),
      error: () => this.toast.error(this.translate.instant('common.downloadFailed')),
    });
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
