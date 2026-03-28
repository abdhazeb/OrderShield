import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FileSizePipe } from '../../pipes/file-size.pipe';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [TranslateModule, FileSizePipe],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileUploadComponent {
  label = input<string>();
  hint = input<string>();
  accept = input('image/*,.pdf,.doc,.docx');
  multiple = input(true);
  maxSizeMb = input(10);
  filesSelected = output<File[]>();

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
    const validFiles = newFiles.filter(f => f.size <= this.maxSizeMb() * 1024 * 1024);
    this.files = [...this.files, ...validFiles];
    this.filesSelected.emit(this.files);
  }

  removeFile(index: number): void {
    this.files.splice(index, 1);
    this.filesSelected.emit(this.files);
  }
}
