import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FileDownloadService } from './file-download.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

describe('FileDownloadService', () => {
  let service: FileDownloadService;
  let httpMock: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', ['error', 'success', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: ToastService, useValue: toastSpy },
      ],
    });

    service = TestBed.inject(FileDownloadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('requests the file through HttpClient so the auth interceptor can attach the token', () => {
    service.download('reviews/abc/evidence/def', 'invoice.pdf');

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/reviews/abc/evidence/def`);
    expect(req.request.method).toBe('GET');
    // A blob response is what makes an authenticated download possible at all — a plain
    // anchor href would omit the Authorization header and 401.
    expect(req.request.responseType).toBe('blob');

    req.flush(new Blob(['pdf-bytes']));
  });

  it('reports an error to the user when the download fails', () => {
    service.download('subscriptions/abc/payment-proof', 'proof.pdf');

    httpMock
      .expectOne(`${environment.apiBaseUrl}/subscriptions/abc/payment-proof`)
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(toastSpy.error).toHaveBeenCalled();
  });
});
