import { Component, inject, OnInit, signal, ElementRef, ViewChild, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { SeverityLevel } from '../../core/enums';
import { EntitySearchResult, EntityDetail, PaginatedResult } from '../../core/models';

@Component({
  selector: 'app-submit-review',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, FileUploadComponent],
  templateUrl: './submit-review.component.html',
  styleUrl: './submit-review.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubmitReviewComponent implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  submitting = signal(false);
  submitted = signal(false);
  submissionMode = signal<'review' | 'comment'>('review');
  prefilledEntityId: string | null = null;
  evidenceFiles: File[] = [];

  // Autocomplete signals
  entitySuggestions = signal<EntitySearchResult[]>([]);
  showSuggestions = signal(false);
  entitySearching = signal(false);
  private searchSubject = new Subject<string>();

  form!: FormGroup;
  countryDialCode = signal('+');

  readonly countryOptions: { name: string; code: string }[] = [
    { name: 'Afghanistan', code: '+93' }, { name: 'Albania', code: '+355' }, { name: 'Algeria', code: '+213' },
    { name: 'Argentina', code: '+54' }, { name: 'Australia', code: '+61' }, { name: 'Austria', code: '+43' },
    { name: 'Bahrain', code: '+973' }, { name: 'Bangladesh', code: '+880' }, { name: 'Belgium', code: '+32' },
    { name: 'Brazil', code: '+55' }, { name: 'Cambodia', code: '+855' }, { name: 'Canada', code: '+1' },
    { name: 'Chile', code: '+56' }, { name: 'China', code: '+86' }, { name: 'Colombia', code: '+57' },
    { name: 'Czech Republic', code: '+420' }, { name: 'Denmark', code: '+45' }, { name: 'Egypt', code: '+20' },
    { name: 'Ethiopia', code: '+251' }, { name: 'Finland', code: '+358' }, { name: 'France', code: '+33' },
    { name: 'Germany', code: '+49' }, { name: 'Ghana', code: '+233' }, { name: 'Greece', code: '+30' },
    { name: 'Hong Kong', code: '+852' }, { name: 'Hungary', code: '+36' }, { name: 'India', code: '+91' },
    { name: 'Indonesia', code: '+62' }, { name: 'Iran', code: '+98' }, { name: 'Iraq', code: '+964' },
    { name: 'Ireland', code: '+353' }, { name: 'Israel', code: '+972' }, { name: 'Italy', code: '+39' },
    { name: 'Japan', code: '+81' }, { name: 'Jordan', code: '+962' }, { name: 'Kenya', code: '+254' },
    { name: 'Kuwait', code: '+965' }, { name: 'Lebanon', code: '+961' }, { name: 'Libya', code: '+218' },
    { name: 'Malaysia', code: '+60' }, { name: 'Mexico', code: '+52' }, { name: 'Morocco', code: '+212' },
    { name: 'Myanmar', code: '+95' }, { name: 'Nepal', code: '+977' }, { name: 'Netherlands', code: '+31' },
    { name: 'New Zealand', code: '+64' }, { name: 'Nigeria', code: '+234' }, { name: 'Norway', code: '+47' },
    { name: 'Oman', code: '+968' }, { name: 'Pakistan', code: '+92' }, { name: 'Peru', code: '+51' },
    { name: 'Philippines', code: '+63' }, { name: 'Poland', code: '+48' }, { name: 'Portugal', code: '+351' },
    { name: 'Qatar', code: '+974' }, { name: 'Romania', code: '+40' }, { name: 'Russia', code: '+7' },
    { name: 'Saudi Arabia', code: '+966' }, { name: 'Singapore', code: '+65' }, { name: 'South Africa', code: '+27' },
    { name: 'South Korea', code: '+82' }, { name: 'Spain', code: '+34' }, { name: 'Sri Lanka', code: '+94' },
    { name: 'Sweden', code: '+46' }, { name: 'Switzerland', code: '+41' }, { name: 'Taiwan', code: '+886' },
    { name: 'Tanzania', code: '+255' }, { name: 'Thailand', code: '+66' }, { name: 'Tunisia', code: '+216' },
    { name: 'Turkey', code: '+90' }, { name: 'UAE', code: '+971' }, { name: 'Uganda', code: '+256' },
    { name: 'Ukraine', code: '+380' }, { name: 'United Kingdom', code: '+44' }, { name: 'United States', code: '+1' },
    { name: 'Uzbekistan', code: '+998' }, { name: 'Venezuela', code: '+58' }, { name: 'Vietnam', code: '+84' },
    { name: 'Yemen', code: '+967' },
  ];

  ngOnInit(): void {
    this.prefilledEntityId = this.route.snapshot.paramMap.get('entityId');
    const modeParam = this.route.snapshot.queryParamMap.get('mode');
    if (modeParam === 'comment') {
      this.submissionMode.set('comment');
    }

    this.form = this.fb.group({
      entityName: ['', Validators.required],
      contactName: [''],
      contactPhoneUsed: [''],
      supplierCountry: [''],
      supplierProvince: [''],
      productCategory: ['', Validators.required],
      incidentDate: [''],
      severity: [null],
      title: ['', [Validators.required, Validators.minLength(5)]],
      narrative: ['', [Validators.required, Validators.minLength(50)]],
      product: [''],
      confirmed: [false, Validators.requiredTrue],
    });

    // Watch country changes to update dial code
    this.form.get('supplierCountry')!.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(country => {
      const val = (country as string) || '';
      const match = this.countryOptions.find(c => c.name.toLowerCase() === val.toLowerCase());
      this.countryDialCode.set(match ? match.code : '+');
    });

    // Setup autocomplete search pipeline
    this.searchSubject.pipe(
      takeUntilDestroyed(this.destroyRef),
      debounceTime(300),
      distinctUntilChanged(),
      tap(term => {
        if (!term || term.length < 2) {
          this.entitySuggestions.set([]);
          this.showSuggestions.set(false);
          this.entitySearching.set(false);
          return;
        }
        this.entitySearching.set(true);
      }),
      switchMap(term => {
        if (!term || term.length < 2) return of(null);
        return this.apiService.get<PaginatedResult<EntitySearchResult>>('entities/search', {
          q: term, page: 1, pageSize: 6
        });
      })
    ).subscribe({
      next: (result) => {
        this.entitySearching.set(false);
        if (result) {
          this.entitySuggestions.set(result.items);
          this.showSuggestions.set(result.items.length > 0);
        }
      },
      error: () => {
        this.entitySearching.set(false);
      }
    });

    if (this.prefilledEntityId) {
      // Load entity details for pre-selected entity
      this.apiService.get<EntityDetail>(`entities/${this.prefilledEntityId}`).subscribe({
        next: (entity) => {
          this.form.patchValue({ entityName: entity.legalName });
          this.fillEntityContactInfo(entity);
        },
      });
    }

    this.updateValidators();
  }

  setMode(mode: 'review' | 'comment'): void {
    this.submissionMode.set(mode);
    this.updateValidators();
    if (mode === 'comment') {
      this.form.patchValue({ severity: null });
    }
  }

  private updateValidators(): void {
    const isComment = this.submissionMode() === 'comment';

    const severityCtrl = this.form.get('severity');
    if (!isComment) {
      severityCtrl?.setValidators(Validators.required);
    } else {
      severityCtrl?.clearValidators();
    }
    severityCtrl?.updateValueAndValidity();

    // Title required only for reviews
    const titleCtrl = this.form.get('title');
    if (!isComment) {
      titleCtrl?.setValidators([Validators.required, Validators.minLength(5)]);
    } else {
      titleCtrl?.clearValidators();
    }
    titleCtrl?.updateValueAndValidity();

    // Product category required only for reviews
    const categoryCtrl = this.form.get('productCategory');
    if (!isComment) {
      categoryCtrl?.setValidators(Validators.required);
    } else {
      categoryCtrl?.clearValidators();
    }
    categoryCtrl?.updateValueAndValidity();

    // Narrative: shorter minimum for comments
    const narrativeCtrl = this.form.get('narrative');
    if (!isComment) {
      narrativeCtrl?.setValidators([Validators.required, Validators.minLength(50)]);
    } else {
      narrativeCtrl?.setValidators([Validators.required, Validators.minLength(10)]);
    }
    narrativeCtrl?.updateValueAndValidity();

    // Country required only for new suppliers in review mode
    const countryCtrl = this.form.get('supplierCountry');
    if (!this.prefilledEntityId && !isComment) {
      countryCtrl?.setValidators(Validators.required);
    } else {
      countryCtrl?.clearValidators();
    }
    countryCtrl?.updateValueAndValidity();
  }

  onEntityNameInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this.prefilledEntityId) {
      this.clearSelectedEntity();
    }
    this.searchSubject.next(value);
  }

  onEntityFieldFocus(): void {
    if (this.entitySuggestions().length > 0 && !this.prefilledEntityId) {
      this.showSuggestions.set(true);
    }
  }

  onEntityFieldBlur(): void {
    setTimeout(() => this.showSuggestions.set(false), 200);
  }

  selectEntity(entity: EntitySearchResult): void {
    this.prefilledEntityId = entity.id;
    this.form.patchValue({ entityName: entity.legalName });
    this.showSuggestions.set(false);
    this.entitySuggestions.set([]);
    this.updateValidators();

    this.apiService.get<EntityDetail>(`entities/${entity.id}`).subscribe({
      next: (detail) => this.fillEntityContactInfo(detail),
    });
  }

  clearSelectedEntity(): void {
    this.prefilledEntityId = null;
    this.form.patchValue({ contactPhoneUsed: '', supplierCountry: '', supplierProvince: '' });
    this.updateValidators();
  }

  private fillEntityContactInfo(entity: EntityDetail): void {
    const primaryPhone = entity.phoneNumbers?.find(p => p.isPrimary) || entity.phoneNumbers?.[0];
    this.form.patchValue({
      contactPhoneUsed: primaryPhone?.phoneNumber || '',
    });
    // Auto-fill category if available
    if (entity.productCategories) {
      this.form.patchValue({ productCategory: entity.productCategories.split(',')[0]?.trim() || '' });
    }
  }

  onFilesSelected(files: File[]): void {
    this.evidenceFiles = files;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!control && control.invalid && (control.touched || this.submitted());
  }

  isFormReady(): boolean {
    if (!this.form.valid) return false;
    if (this.submissionMode() === 'review' && this.evidenceFiles.length === 0) return false;
    return true;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (!this.isFormReady() || this.submitting()) return;

    this.submitting.set(true);
    const formValue = this.form.value;

    // Use logged-in user's email as verification email
    const currentUser = this.authService.currentUser();

    const reviewData: Record<string, unknown> = {
      reviewerType: 0, // FirstParty
      transactionRole: 'Buyer', // Default since field was removed
      severity: this.submissionMode() === 'comment' ? 0 : formValue.severity, // Info for comments
      title: formValue.title,
      narrative: formValue.narrative,
      product: formValue.product,
      productCategory: formValue.productCategory,
      incidentDate: formValue.incidentDate || null,
      contactName: formValue.contactName || null,
      contactPhoneUsed: (this.countryDialCode() !== '+' && formValue.contactPhoneUsed)
        ? this.countryDialCode() + formValue.contactPhoneUsed
        : formValue.contactPhoneUsed,
      verificationEmail: currentUser?.email || '',
      isComment: this.submissionMode() === 'comment',
    };

    // Country/province for new supplier
    if (!this.prefilledEntityId) {
      reviewData['supplierCountry'] = formValue.supplierCountry;
      reviewData['supplierProvince'] = formValue.supplierProvince;
    }

    if (this.prefilledEntityId) {
      reviewData['tradeEntityId'] = this.prefilledEntityId;
    } else {
      reviewData['entityName'] = formValue.entityName;
    }

    this.apiService.post<{ data: string }>('reviews', reviewData).subscribe({
      next: (result) => {
        if (this.evidenceFiles.length > 0 && result?.data) {
          this.uploadEvidence(result.data);
        } else {
          this.submitting.set(false);
          this.toast.success(this.translate.instant('review.successSubmitted'));
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        let msg = 'Unknown error';
        if (err?.error?.errors) {
          const errors = err.error.errors;
          if (typeof errors === 'object' && !Array.isArray(errors)) {
            msg = Object.values(errors).flat().join('\n');
          } else if (Array.isArray(errors)) {
            msg = errors.join('\n');
          }
        } else if (err?.error?.detail) {
          msg = err.error.detail;
        } else if (err?.error?.message) {
          msg = err.error.message;
        } else if (err?.message) {
          msg = err.message;
        }
        this.toast.error(this.translate.instant('review.failedSubmit') + ' ' + msg);
      },
    });
  }

  private uploadEvidence(reviewId: string): void {
    const formData = new FormData();
    this.evidenceFiles.forEach(f => formData.append('files', f));

    this.apiService.upload<any>(`reviews/${reviewId}/evidence`, formData).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success(this.translate.instant('review.successWithEvidence'));
        this.router.navigate(['/']);
      },
      error: () => {
        this.submitting.set(false);
        this.toast.warning(this.translate.instant('review.evidenceUploadFailed'));
        this.router.navigate(['/']);
      },
    });
  }
}
