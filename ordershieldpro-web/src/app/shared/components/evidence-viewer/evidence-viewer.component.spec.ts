import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EvidenceViewerComponent } from './evidence-viewer.component';
import { EvidenceFileRef } from '../../../core/models';

@Component({
  standalone: true,
  imports: [EvidenceViewerComponent],
  template: `<app-evidence-viewer [reviewId]="reviewId" [files]="files" [layout]="layout" />`,
})
class HostComponent {
  reviewId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  files: EvidenceFileRef[] = [];
  layout: 'grid' | 'compact' = 'compact';
}

describe('EvidenceViewerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let http: HttpTestingController;

  const imageFile: EvidenceFileRef = {
    id: '11111111-1111-1111-1111-111111111111',
    fileName: 'proof.png',
    contentType: 'image/png',
    fileSizeBytes: 2048,
  };
  const docFile: EvidenceFileRef = {
    id: '22222222-2222-2222-2222-222222222222',
    fileName: 'terms.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSizeBytes: 4096,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, HttpClientTestingModule, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /**
   * Regression: rebuild() both reads and writes the `previews` signal. When it ran inside the
   * effect's reactive context the effect depended on a signal it wrote, re-triggering itself
   * forever and freezing the tab. If that returns, this spec hangs instead of passing.
   */
  it('settles after change detection instead of looping', () => {
    fixture.componentInstance.files = [imageFile, docFile];
    fixture.detectChanges();
    fixture.detectChanges();

    // Compact layout defers fetching until a file is opened, so no request yet.
    http.expectNone(() => true);
    expect(fixture.nativeElement.querySelectorAll('.ev-chip').length).toBe(2);
  });

  it('lists nothing and says so when there is no evidence', () => {
    fixture.componentInstance.files = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ev-empty')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.ev-chip').length).toBe(0);
  });

  it('fetches renderable files up front in the grid layout', () => {
    fixture.componentInstance.layout = 'grid';
    fixture.componentInstance.files = [imageFile, docFile];
    fixture.detectChanges();

    // The image is fetched for its thumbnail; the .docx is download-only and is not pulled.
    const req = http.expectOne(`/api/reviews/${fixture.componentInstance.reviewId}/evidence/${imageFile.id}`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }));

    http.expectNone(`/api/reviews/${fixture.componentInstance.reviewId}/evidence/${docFile.id}`);
  });

  it('marks a preview failed when the fetch errors, without retrying on its own', () => {
    fixture.componentInstance.layout = 'grid';
    fixture.componentInstance.files = [imageFile];
    fixture.detectChanges();

    // A blob-typed request cannot be flushed with a string body, so fail it as a transport error.
    http.expectOne(`/api/reviews/${fixture.componentInstance.reviewId}/evidence/${imageFile.id}`)
      .error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    // The tile offers a manual retry (grid tiles otherwise only show a download button)...
    const buttons: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.ev-btn'));
    expect(buttons.length).toBe(2);

    // ...and a failed preview must not re-request on its own — that was the other freeze risk.
    http.expectNone(() => true);
    expect(fixture.nativeElement.querySelector('.ev-fallback')).toBeTruthy();
  });
});
