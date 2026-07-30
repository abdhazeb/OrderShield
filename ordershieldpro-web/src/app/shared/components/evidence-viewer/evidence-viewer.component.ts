import {
  Component, ChangeDetectionStrategy, inject, input, signal, computed, effect, untracked, OnDestroy,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { FileDownloadService } from '../../../core/services/file-download.service';
import { EvidenceFileRef } from '../../../core/models';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { FileSizePipe } from '../../pipes/file-size.pipe';

/** An evidence file plus the in-memory blob URL used to render it. */
interface EvidencePreview {
  file: EvidenceFileRef;
  kind: 'image' | 'pdf' | 'other';
  /** Object URL for the fetched blob; null until loaded, revoked when this view goes away. */
  objectUrl: string | null;
  safeUrl: SafeResourceUrl | null;
  loading: boolean;
  failed: boolean;
}

/**
 * Renders a review's evidence files for reading **inside the app** — thumbnails plus a
 * full-size viewer with prev/next. Nothing is saved to the reviewer's machine: each file is
 * fetched as a blob (which is how the bearer token gets attached — a plain <img src> to a
 * protected endpoint would 401), held in memory as an object URL, and revoked when the view
 * is destroyed. Downloading stays available as an explicit per-file action for the formats a
 * browser cannot display, and for when a moderator genuinely wants a copy.
 *
 * Used by both the moderation queue card and the full dossier page.
 */
@Component({
  selector: 'app-evidence-viewer',
  standalone: true,
  imports: [TranslateModule, LoadingSpinnerComponent, FileSizePipe],
  templateUrl: './evidence-viewer.component.html',
  styleUrl: './evidence-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvidenceViewerComponent implements OnDestroy {
  private api = inject(ApiService);
  private fileDownload = inject(FileDownloadService);
  private sanitizer = inject(DomSanitizer);

  reviewId = input.required<string>();
  files = input.required<readonly EvidenceFileRef[]>();

  /** `grid` shows thumbnails; `compact` shows a single row of openable file chips. */
  layout = input<'grid' | 'compact'>('grid');

  previews = signal<EvidencePreview[]>([]);
  expandedIndex = signal<number | null>(null);
  expanded = computed(() => {
    const i = this.expandedIndex();
    return i === null ? null : this.previews()[i] ?? null;
  });

  constructor() {
    effect(() => {
      // Only the inputs may be tracked. rebuild() both reads and writes `previews`, so
      // running it inside the reactive context would make this effect depend on a signal it
      // writes — it would re-trigger itself forever and lock up the tab. untracked() keeps
      // the dependency list to the two inputs below.
      const files = this.files();
      const reviewId = this.reviewId();
      untracked(() => this.rebuild(files, reviewId));
    });
  }

  ngOnDestroy(): void {
    this.revokeAll();
  }

  private revokeAll(): void {
    for (const p of this.previews()) {
      if (p.objectUrl) URL.revokeObjectURL(p.objectUrl);
    }
  }

  private rebuild(files: readonly EvidenceFileRef[], reviewId: string): void {
    this.revokeAll();
    this.expandedIndex.set(null);

    const next: EvidencePreview[] = (files ?? []).map(file => ({
      file,
      kind: classify(file),
      objectUrl: null,
      safeUrl: null,
      loading: false,
      failed: false,
    }));
    this.previews.set(next);

    if (!reviewId) return;

    // In the grid layout, images and PDFs are fetched up front so the moderator sees the
    // evidence without another click. The compact layout waits for an explicit open so a
    // long queue does not pull every attachment it lists.
    if (this.layout() === 'grid') {
      next.forEach((p, i) => {
        if (p.kind !== 'other') this.loadPreview(i);
      });
    }
  }

  private loadPreview(index: number): void {
    const target = this.previews()[index];
    if (!target) return;

    this.patch(index, { loading: true, failed: false });
    this.api.download(`reviews/${this.reviewId()}/evidence/${target.file.id}`).subscribe({
      next: (blob) => {
        // The download endpoint serves files as attachments, so the blob may arrive without
        // a usable type — re-tag it or <img>/<iframe> will refuse to render it.
        const typed = blob.type && blob.type !== 'application/octet-stream'
          ? blob
          : new Blob([blob], {
              type: target.kind === 'pdf' ? 'application/pdf' : target.file.contentType,
            });
        const objectUrl = URL.createObjectURL(typed);
        this.patch(index, {
          objectUrl,
          safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl),
          loading: false,
        });
      },
      error: () => this.patch(index, { loading: false, failed: true }),
    });
  }

  private patch(index: number, patch: Partial<EvidencePreview>): void {
    this.previews.update(list => list.map((p, i) => i === index ? { ...p, ...patch } : p));
  }

  retryPreview(index: number): void {
    this.loadPreview(index);
  }

  openViewer(index: number): void {
    const preview = this.previews()[index];
    if (!preview) return;
    if (preview.kind === 'other') {
      // Nothing the browser can display — a copy is the only way to read it.
      this.download(preview.file);
      return;
    }
    if (!preview.objectUrl && !preview.loading) this.loadPreview(index);
    this.expandedIndex.set(index);
  }

  closeViewer(): void {
    this.expandedIndex.set(null);
  }

  /** Moves to the next/previous file the browser can render, wrapping at the ends. */
  stepViewer(delta: number): void {
    const viewable = this.previews()
      .map((p, i) => ({ p, i }))
      .filter(x => x.p.kind !== 'other')
      .map(x => x.i);
    if (viewable.length === 0) return;
    const current = this.expandedIndex();
    const at = current === null ? 0 : viewable.indexOf(current);
    const next = viewable[(at + delta + viewable.length) % viewable.length];
    this.openViewer(next);
  }

  download(file: EvidenceFileRef): void {
    this.fileDownload.download(`reviews/${this.reviewId()}/evidence/${file.id}`, file.fileName);
  }
}

function classify(file: EvidenceFileRef): 'image' | 'pdf' | 'other' {
  const type = (file.contentType || '').toLowerCase();
  const name = (file.fileName || '').toLowerCase();
  if (type.startsWith('image/') || /\.(jpe?g|png|gif|bmp|webp)$/.test(name)) return 'image';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  return 'other';
}
