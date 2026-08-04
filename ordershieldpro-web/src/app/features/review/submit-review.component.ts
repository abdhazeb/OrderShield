import { Component, inject, OnInit, signal, ElementRef, ViewChild, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';

import { EntitySearchResult, EntityDetail, PaginatedResult, ReviewEdit } from '../../core/models';
import { LocalizeValuePipe } from '../../shared/pipes/localize-value.pipe';

/**
 * Turns a canonical English label into the camelCase suffix used for its i18n key
 * ("United Kingdom" -> "unitedKingdom", "Finance / Accounting" -> "financeAccounting").
 */
function camelize(label: string): string {
  return label
    .replace(/[^a-zA-Z ]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word, i) => i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

@Component({
  selector: 'app-submit-review',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, FileUploadComponent, LocalizeValuePipe],
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
  editMode = signal(false);
  private editReviewId: string | null = null;
  prefilledEntityId: string | null = null;
  evidenceFiles: File[] = [];

  // Autocomplete signals
  entitySuggestions = signal<EntitySearchResult[]>([]);
  showSuggestions = signal(false);
  entitySearching = signal(false);
  private searchSubject = new Subject<string>();

  form!: FormGroup;
  countryDialCode = signal('+');

  /**
   * Countries shown in the current UI language, sorted by the translated label.
   * `name` stays the canonical English value that is persisted — the localized
   * `label` is only ever what the user reads and types.
   */
  localizedCountries = signal<{ name: string; label: string; code: string }[]>([]);

  /**
   * Roles the counterparty may hold at the entity. Canonical English values are stored
   * so a review filed in Arabic still reads correctly for an English-speaking moderator;
   * `Other` reveals a free-text box for titles this list does not cover.
   */
  readonly contactPositionOptions: string[] = [
    'Owner',
    'General Manager',
    'Purchasing Manager',
    'Sales Manager',
    'Sales Representative',
    'Export Manager',
    'Production Manager',
    'Quality Manager',
    'Logistics Manager',
    'Finance / Accounting',
    'Engineer',
    'Agent / Middleman',
    'Receptionist',
    'Unknown',
  ];

  get alternativeNames(): FormArray {
    return this.form.get('alternativeNames') as FormArray;
  }

  get additionalPhones(): FormArray {
    return this.form.get('additionalPhones') as FormArray;
  }

  addAlternativeName(): void {
    this.alternativeNames.push(this.fb.control(''));
  }

  removeAlternativeName(index: number): void {
    this.alternativeNames.removeAt(index);
  }

  addAdditionalPhone(): void {
    this.additionalPhones.push(this.fb.control(''));
  }

  removeAdditionalPhone(index: number): void {
    this.additionalPhones.removeAt(index);
  }

  /**
   * Prefixes the selected country's dial code, unless the reviewer already typed one.
   * The stored number is what entity search matches on, so it has to be the full number.
   */
  private withDialCode(phone: string): string {
    const value = (phone || '').trim();
    if (!value || value.startsWith('+') || this.countryDialCode() === '+') return value;
    return this.countryDialCode() + value;
  }

  /** Non-empty, de-duplicated values from one of the repeatable field arrays. */
  private collect(array: FormArray): string[] {
    const seen = new Set<string>();
    const values: string[] = [];
    for (const raw of array.value as string[]) {
      const value = (raw || '').trim();
      if (!value || seen.has(value.toLowerCase())) continue;
      seen.add(value.toLowerCase());
      values.push(value);
    }
    return values;
  }

  /** i18n key suffix for a canonical contact-position value. */
  positionKey(position: string): string {
    return 'contactPosition.' + camelize(position);
  }

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

    // Edit mode is driven purely by the reviewId query param; the values are then fetched
    // from the API rather than read out of navigation state, so a reload works and the
    // contact fields (which the list DTOs omit) are never submitted back blank.
    const editReviewId = this.route.snapshot.queryParamMap.get('reviewId');
    if (editReviewId) {
      this.editMode.set(true);
      this.editReviewId = editReviewId;
    }

    this.form = this.fb.group({
      entityName: ['', Validators.required],
      // One entity often trades under several names and answers several numbers. Each
      // extra row here becomes a searchable alias / phone on the entity itself, which is
      // how the next person finds it under whichever name or number they were given.
      alternativeNames: this.fb.array([] as FormControl<string>[]),
      additionalPhones: this.fb.array([] as FormControl<string>[]),
      contactName: [''],
      contactPosition: [''],
      contactPositionOther: [''],
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

    this.rebuildLocalizedCountries();

    // The datalist shows translated country names, so a language switch mid-form would
    // leave a stale label in the box — re-label it against the new locale.
    this.translate.onLangChange.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      const canonical = this.resolveCountryName(this.form.get('supplierCountry')?.value || '');
      this.rebuildLocalizedCountries();
      if (canonical) {
        this.form.patchValue({ supplierCountry: this.localizeCountryName(canonical) });
      }
    });

    // Watch country changes to update dial code
    this.form.get('supplierCountry')!.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(country => {
      const canonical = this.resolveCountryName((country as string) || '');
      const match = this.countryOptions.find(c => c.name === canonical);
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

    if (this.editMode()) {
      this.loadReviewForEdit();
    }

    this.updateValidators();
  }

  /** Prefills the form from the review's stored values so an edit round-trips intact. */
  private loadReviewForEdit(): void {
    this.apiService.get<ReviewEdit>(`reviews/${this.editReviewId}/edit`).subscribe({
      next: (review) => {
        this.prefilledEntityId = review.tradeEntityId || null;
        this.submissionMode.set(review.isComment ? 'comment' : 'review');

        const position = review.contactPosition || '';
        const isKnownPosition = this.contactPositionOptions.includes(position);
        this.form.patchValue({
          entityName: review.tradeEntityName || '',
          contactName: review.contactName || '',
          contactPosition: position ? (isKnownPosition ? position : 'Other') : '',
          contactPositionOther: isKnownPosition ? '' : position,
          contactPhoneUsed: review.contactPhoneUsed || '',
          productCategory: review.productCategory || '',
          product: review.product || '',
          severity: review.severity,
          title: review.title || '',
          narrative: review.narrative || '',
          incidentDate: review.incidentDate ? review.incidentDate.substring(0, 10) : '',
          confirmed: true,
        });
        this.updateValidators();
      },
      error: () => {
        this.toast.error(this.translate.instant('review.editLoadFailed'));
        this.router.navigate(['/profile']);
      },
    });
  }

  /** i18n key for a canonical English country name. */
  private countryKey(name: string): string {
    return 'country.' + camelize(name);
  }

  private localizeCountryName(name: string): string {
    const key = this.countryKey(name);
    const translated = this.translate.instant(key);
    // ngx-translate echoes the key back when it has no entry — fall back to English.
    return translated === key ? name : translated;
  }

  private rebuildLocalizedCountries(): void {
    const localized = this.countryOptions.map(c => ({
      name: c.name,
      label: this.localizeCountryName(c.name),
      code: c.code,
    }));
    localized.sort((a, b) => a.label.localeCompare(b.label, this.translate.currentLang || 'en'));
    this.localizedCountries.set(localized);
  }

  /**
   * Maps whatever the user typed or picked back to the canonical English country name,
   * which is what the API stores. Free text that matches nothing is passed through so a
   * country missing from the list is still accepted.
   */
  private resolveCountryName(input: string): string {
    const value = input.trim();
    if (!value) return '';
    const lower = value.toLowerCase();
    const byLabel = this.localizedCountries().find(c => c.label.toLowerCase() === lower);
    if (byLabel) return byLabel.name;
    const byName = this.countryOptions.find(c => c.name.toLowerCase() === lower);
    return byName ? byName.name : value;
  }

  /** True when "Other" is selected and the free-text box should show. */
  isOtherPosition(): boolean {
    return this.form?.get('contactPosition')?.value === 'Other';
  }

  /** The value actually sent for contact position: the free text when "Other". */
  private resolveContactPosition(): string | null {
    const selected = (this.form.get('contactPosition')?.value as string) || '';
    if (!selected) return null;
    if (selected !== 'Other') return selected;
    const other = ((this.form.get('contactPositionOther')?.value as string) || '').trim();
    return other || null;
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
    this.form.patchValue({
      contactPhoneUsed: entity.phoneNumbers?.[0] || '',
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
    // Evidence is required only when creating a new review, not when editing.
    if (!this.editMode() && this.submissionMode() === 'review' && this.evidenceFiles.length === 0) return false;
    return true;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (!this.isFormReady() || this.submitting()) return;

    this.submitting.set(true);
    const formValue = this.form.value;

    if (this.editMode() && this.editReviewId) {
      this.submitEdit(formValue);
      return;
    }

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
      contactPosition: this.resolveContactPosition(),
      contactPhoneUsed: this.withDialCode(formValue.contactPhoneUsed),
      // Merged onto the entity as searchable aliases and phone numbers, not onto the
      // review itself — the point is that the *next* search finds this entity by them.
      alternativeEntityNames: this.collect(this.alternativeNames),
      additionalPhoneNumbers: this.collect(this.additionalPhones).map(p => this.withDialCode(p)),
      verificationEmail: currentUser?.email || '',
      isComment: this.submissionMode() === 'comment',
    };

    // Country/province for new supplier. The country is stored canonically in English
    // regardless of the language the reviewer picked it in.
    if (!this.prefilledEntityId) {
      reviewData['supplierCountry'] = this.resolveCountryName(formValue.supplierCountry || '');
      reviewData['supplierProvince'] = formValue.supplierProvince;
    }

    if (this.prefilledEntityId) {
      reviewData['tradeEntityId'] = this.prefilledEntityId;
    } else {
      reviewData['entityName'] = formValue.entityName;
    }

    // POST /api/reviews responds with { id } — not a Result envelope. Reading the wrong
    // property here silently skipped the evidence upload entirely.
    this.apiService.post<{ id: string }>('reviews', reviewData).subscribe({
      next: (result) => {
        if (this.evidenceFiles.length > 0 && result?.id) {
          this.uploadEvidence(result.id);
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

  private submitEdit(formValue: any): void {
    const isComment = this.submissionMode() === 'comment';
    const payload: Record<string, unknown> = {
      severity: isComment ? 0 : formValue.severity,
      title: formValue.title,
      narrative: formValue.narrative,
      product: formValue.product,
      productCategory: formValue.productCategory,
      incidentDate: formValue.incidentDate || null,
      contactName: formValue.contactName || null,
      contactPosition: this.resolveContactPosition(),
      contactPhoneUsed: this.withDialCode(formValue.contactPhoneUsed),
      isComment,
    };

    this.apiService.put(`reviews/${this.editReviewId}`, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success(this.translate.instant('review.editSuccess'));
        this.router.navigate(['/profile']);
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
        this.toast.error(this.translate.instant('review.editFailed') + ' ' + msg);
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
