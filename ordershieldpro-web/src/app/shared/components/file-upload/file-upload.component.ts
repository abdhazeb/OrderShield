import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div
      class="upload-area"
      [class.dragover]="isDragover"
      (dragover)="onDragOver($event)"
      (dragleave)="isDragover = false"
      (drop)="onDrop($event)"
      (click)="fileInput.click()">
      <span class="upload-icon">📎</span>
      <div class="upload-text">
        {{ label || ('review.uploadEvidence' | translate) }}
      </div>
      <div class="upload-hint">{{ hint || 'Drag & drop or tap to upload (max 10MB)' }}</div>
      <input
        #fileInput
        type="file"
        [accept]="accept"
        [multiple]="multiple"
        (change)="onFileSelect($event)"
        style="display: none"
      />
    </div>
    @if (files.length > 0) {
      <div class="file-list">
        @for (file of files; track file.name; let i = $index) {
          <div class="file-item">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">{{ formatSize(file.size) }}</span>
            <button class="remove-btn" (click)="removeFile(i)">✕</button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .upload-area {
      border: 2px dashed var(--surface-border);
      border-radius: var(--radius-lg);
      padding: 32px;
      text-align: center;
      cursor: pointer;
      transition: border-color var(--transition-fast), background var(--transition-fast);
    }

    .upload-area:hover,
    .upload-area.dragover {
      border-color: var(--accent-600);
      background: var(--accent-50);
    }

    .upload-icon {
      font-size: 32px;
      display: block;
      margin-bottom: 8px;
    }

    .upload-text {
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .upload-hint {
      font-size: 12px;
      color: var(--text-muted);
    }

    .file-list {
      margin-top: 12px;
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--surface-100);
      border-radius: var(--radius-sm);
      margin-bottom: 6px;
    }

    .file-name {
      flex: 1;
      font-size: 13px;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .remove-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--danger);
      font-size: 14px;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
    }

    .remove-btn:hover {
      background: var(--danger-bg);
    }
  `]
})
export class FileUploadComponent {
  @Input() label?: string;
  @Input() hint?: string;
  @Input() accept = 'image/*,.pdf,.doc,.docx';
  @Input() multiple = true;
  @Input() maxSizeMb = 10;
  @Output() filesSelected = new EventEmitter<File[]>();

  files: File[] = [];
  isDragover = false;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragover = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragover = false;
    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles) {
      this.addFiles(Array.from(droppedFiles));
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private addFiles(newFiles: File[]): void {
    const validFiles = newFiles.filter(f => f.size <= this.maxSizeMb * 1024 * 1024);
    this.files = [...this.files, ...validFiles];
    this.filesSelected.emit(this.files);
  }

  removeFile(index: number): void {
    this.files.splice(index, 1);
    this.filesSelected.emit(this.files);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
