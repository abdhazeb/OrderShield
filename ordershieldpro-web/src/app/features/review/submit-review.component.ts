import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { SeverityLevel } from '../../core/enums';

@Component({
  selector: 'app-submit-review',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, FileUploadComponent],
  template: `
    <div class="submit-page">
      <h1 class="page-title">✍️ {{ 'review.submit' | translate }}</h1>

      <!-- Info Alert -->
      <div class="info-alert">
        <span class="info-icon">ℹ️</span>
        <p>Your review will be verified by our team before publication. Please provide accurate details and evidence where possible.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="review-form">

        <!-- Entity Name -->
        <div class="form-group">
          <label class="form-label">{{ 'entity.legalName' | translate }} *</label>
          <input class="form-input" [class.input-error]="isFieldInvalid('entityName')" type="text" formControlName="entityName" placeholder="Enter company/entity name" />
          @if (isFieldInvalid('entityName')) {
            <div class="field-error">Entity name is required</div>
          }
          @if (prefilledEntityId) {
            <div class="form-help">Entity pre-selected from profile</div>
          }
        </div>

        <!-- Contact Info -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ 'review.contactPhone' | translate }}</label>
            <input class="form-input" type="tel" formControlName="contactPhoneUsed" placeholder="+86..." />
            <div class="form-help">Helps track entity rebrand activity</div>
          </div>
          <div class="form-group">
            <label class="form-label">{{ 'review.contactWeChat' | translate }}</label>
            <input class="form-input" type="text" formControlName="contactWeChatUsed" placeholder="WeChat ID" />
          </div>
        </div>

        <!-- Transaction Relationship -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ 'review.transactionRole' | translate }} *</label>
            <select class="form-select" [class.input-error]="isFieldInvalid('transactionRole')" formControlName="transactionRole">
              <option value="">Select relationship</option>
              <option value="Buyer">{{ 'review.roleBuyer' | translate }}</option>
              <option value="Agent">{{ 'review.roleAgent' | translate }}</option>
              <option value="Inspector">{{ 'review.roleInspector' | translate }}</option>
            </select>
            @if (isFieldInvalid('transactionRole')) {
              <div class="field-error">Transaction role is required</div>
            }
          </div>
        </div>

        <!-- Product Category & Date -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ 'review.productCategory' | translate }}</label>
            <select class="form-select" formControlName="productCategory">
              <option value="">Select category</option>
              <option value="Electronics">Electronics</option>
              <option value="Textiles">Textiles & Apparel</option>
              <option value="Machinery">Machinery & Equipment</option>
              <option value="Food">Food & Agriculture</option>
              <option value="Chemicals">Chemicals</option>
              <option value="Construction">Construction Materials</option>
              <option value="Automotive">Automotive Parts</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ 'review.incidentDate' | translate }} *</label>
            <input class="form-input" [class.input-error]="isFieldInvalid('incidentDate')" type="date" formControlName="incidentDate" />
            @if (isFieldInvalid('incidentDate')) {
              <div class="field-error">Incident date is required</div>
            }
          </div>
        </div>

        <!-- Review Type Selector -->
        <div class="form-group">
          <label class="form-label">{{ 'review.reviewType' | translate }} *</label>
          @if (isFieldInvalid('severity')) {
            <div class="field-error">Please select a review type</div>
          }
          <div class="type-selector" [class.selector-error]="isFieldInvalid('severity')">
            <button type="button" class="type-option" [class.selected]="selectedSeverity() === 0"
                    (click)="selectSeverity(0)">
              <span class="type-icon">ℹ️</span>
              <span class="type-label">{{ 'severity.info' | translate }}</span>
              <span class="type-desc">{{ 'severity.infoDesc' | translate }}</span>
            </button>
            <button type="button" class="type-option warning" [class.selected]="selectedSeverity() === 1"
                    (click)="selectSeverity(1)">
              <span class="type-icon">⚠️</span>
              <span class="type-label">{{ 'severity.warning' | translate }}</span>
              <span class="type-desc">{{ 'severity.warningDesc' | translate }}</span>
            </button>
            <button type="button" class="type-option critical" [class.selected]="selectedSeverity() === 2"
                    (click)="selectSeverity(2)">
              <span class="type-icon">🚨</span>
              <span class="type-label">{{ 'severity.critical' | translate }}</span>
              <span class="type-desc">{{ 'severity.criticalDesc' | translate }}</span>
            </button>
            <button type="button" class="type-option behavior" [class.selected]="selectedSeverity() === 3"
                    (click)="selectSeverity(3)">
              <span class="type-icon">😤</span>
              <span class="type-label">{{ 'severity.behavior' | translate }}</span>
              <span class="type-desc">{{ 'severity.behaviorDesc' | translate }}</span>
            </button>
            <button type="button" class="type-option fraud" [class.selected]="selectedSeverity() === 4"
                    (click)="selectSeverity(4)">
              <span class="type-icon">🕵️</span>
              <span class="type-label">{{ 'severity.fraud' | translate }}</span>
              <span class="type-desc">{{ 'severity.fraudDesc' | translate }}</span>
            </button>
            <button type="button" class="type-option quality" [class.selected]="selectedSeverity() === 5"
                    (click)="selectSeverity(5)">
              <span class="type-icon">📦</span>
              <span class="type-label">{{ 'severity.quality' | translate }}</span>
              <span class="type-desc">{{ 'severity.qualityDesc' | translate }}</span>
            </button>
            <button type="button" class="type-option delivery" [class.selected]="selectedSeverity() === 6"
                    (click)="selectSeverity(6)">
              <span class="type-icon">🚛</span>
              <span class="type-label">{{ 'severity.delivery' | translate }}</span>
              <span class="type-desc">{{ 'severity.deliveryDesc' | translate }}</span>
            </button>
            <button type="button" class="type-option payment" [class.selected]="selectedSeverity() === 7"
                    (click)="selectSeverity(7)">
              <span class="type-icon">💰</span>
              <span class="type-label">{{ 'severity.payment' | translate }}</span>
              <span class="type-desc">{{ 'severity.paymentDesc' | translate }}</span>
            </button>
          </div>
        </div>

        <!-- Title -->
        <div class="form-group">
          <label class="form-label">{{ 'review.title' | translate }} *</label>
          <input class="form-input" [class.input-error]="isFieldInvalid('title')" type="text" formControlName="title" placeholder="Brief summary of your experience" />
          @if (isFieldInvalid('title')) {
            <div class="field-error">
              @if (form.get('title')?.errors?.['required']) {
                Title is required
              } @else {
                Title must be at least 5 characters
              }
            </div>
          }
        </div>

        <!-- Narrative -->
        <div class="form-group">
          <label class="form-label">{{ 'review.narrative' | translate }} *</label>
          <textarea class="form-textarea" [class.input-error]="isFieldInvalid('narrative')" formControlName="narrative"
                    placeholder="Describe your experience in detail..."
                    rows="6"></textarea>
          <div class="form-help">
            {{ 'review.narrativeHint' | translate }}
            ({{ form.get('narrative')?.value?.length || 0 }}/100 min)
          </div>
          @if (isFieldInvalid('narrative') && form.get('narrative')?.errors?.['minlength']) {
            <div class="field-error">Narrative must be at least 100 characters</div>
          }
        </div>

        <!-- Product & Order Value -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">{{ 'review.product' | translate }}</label>
            <input class="form-input" type="text" formControlName="product" placeholder="Product name" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ 'review.orderValue' | translate }}</label>
            <input class="form-input" type="number" formControlName="orderValue" placeholder="0" />
          </div>
        </div>

        <!-- File Upload -->
        <div class="form-group">
          <label class="form-label">{{ 'review.uploadEvidence' | translate }}</label>
          <app-file-upload (filesSelected)="onFilesSelected($event)" />
        </div>

        <!-- Verification Email -->
        <div class="form-group">
          <label class="form-label">{{ 'review.verificationEmail' | translate }} *</label>
          <input class="form-input" [class.input-error]="isFieldInvalid('verificationEmail')" type="email" formControlName="verificationEmail" placeholder="your@email.com" />
          @if (isFieldInvalid('verificationEmail')) {
            <div class="field-error">
              @if (form.get('verificationEmail')?.errors?.['required']) {
                Email is required
              } @else {
                Please enter a valid email
              }
            </div>
          }
        </div>

        <!-- Confirmation -->
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" formControlName="confirmed" />
            <span>I confirm that all information provided is accurate and truthful to the best of my knowledge.</span>
          </label>
        </div>

        <!-- Submit -->
        @if (submitted() && !form.valid) {
          <div class="validation-summary">
            ⚠️ Please fill in all required fields marked with * above.
          </div>
        }
        <button type="submit" class="btn btn-primary submit-btn"
                [class.btn-disabled]="!form.valid"
                [disabled]="submitting()">
          @if (submitting()) {
            <span class="spinner-sm"></span>
          }
          {{ 'review.submitReview' | translate }}
        </button>
      </form>
    </div>
  `,
  styles: [`
    .submit-page { padding: 16px; max-width: 700px; margin: 0 auto; }
    .page-title {
      font-family: var(--font-display); font-size: 22px; font-weight: 700;
      color: var(--text-primary); margin-bottom: 16px; letter-spacing: -0.02em;
    }

    .info-alert {
      display: flex; gap: 10px; background: var(--accent-50); border: 1px solid var(--accent-200);
      border-radius: var(--radius-lg); padding: 12px 16px; margin-bottom: 20px;
      font-size: 13px; color: var(--accent-600); line-height: 1.5;
    }
    .info-icon { font-size: 18px; flex-shrink: 0; }

    .review-form { display: flex; flex-direction: column; gap: 0; }

    .form-group { margin-bottom: 20px; }
    .form-label { display: block; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); font-size: 14px; }
    .form-input, .form-select, .form-textarea {
      width: 100%; padding: 12px; border: 1.5px solid var(--surface-border); border-radius: var(--radius-md);
      font-size: 15px; font-family: var(--font-body); box-sizing: border-box;
      color: var(--text-primary); background: var(--surface-0);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .form-textarea { min-height: 120px; resize: vertical; }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none; border-color: var(--accent-400);
      box-shadow: 0 0 0 3px rgba(15, 145, 151, 0.1);
    }
    .form-help { font-size: 12px; color: var(--text-tertiary); margin-top: 6px; }
    .form-row { display: grid; grid-template-columns: 1fr; gap: 0; }

    .input-error { border-color: var(--danger) !important; }
    .field-error { font-size: 12px; color: var(--danger); margin-top: 4px; font-weight: 500; }
    .selector-error { border: 2px solid var(--danger); border-radius: var(--radius-lg); padding: 4px; }
    .validation-summary {
      background: var(--danger-bg); border: 1px solid #fecaca; border-radius: var(--radius-md);
      padding: 12px 16px; font-size: 14px; color: #991b1b; font-weight: 600;
      margin-bottom: 12px;
    }
    .btn-disabled { opacity: 0.6; }

    .type-selector { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 8px; }
    .type-option {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 14px 8px; border: 1.5px solid var(--surface-border); border-radius: var(--radius-lg);
      background: var(--surface-0); cursor: pointer; transition: all var(--transition-fast); text-align: center;
      font-family: var(--font-body);
    }
    .type-option:hover { border-color: var(--navy-300); }
    .type-option.selected { border-color: var(--accent-400); background: var(--accent-50); }
    .type-option.warning.selected { border-color: #f59e0b; background: #fffbeb; }
    .type-option.critical.selected { border-color: var(--severity-critical); background: var(--severity-critical-bg); }
    .type-option.behavior.selected { border-color: #8b5cf6; background: #f5f3ff; }
    .type-option.fraud.selected { border-color: #ec4899; background: #fdf2f8; }
    .type-option.quality.selected { border-color: var(--accent-500); background: var(--accent-50); }
    .type-option.delivery.selected { border-color: #6366f1; background: #eef2ff; }
    .type-option.payment.selected { border-color: #f59e0b; background: #fffbeb; }
    .type-icon { font-size: 22px; }
    .type-label { font-weight: 700; font-size: 12px; color: var(--text-primary); }
    .type-desc { font-size: 10px; color: var(--text-muted); line-height: 1.3; }

    .checkbox-group { margin-top: 8px; }
    .checkbox-label {
      display: flex; gap: 10px; align-items: start; font-size: 13px; color: var(--text-secondary); cursor: pointer;
    }
    .checkbox-label input { margin-top: 2px; width: 18px; height: 18px; accent-color: var(--accent-600); }

    .btn {
      width: 100%; padding: 14px; border: none; border-radius: var(--radius-lg);
      font-weight: 700; font-size: 16px; cursor: pointer; transition: all var(--transition-base);
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-family: var(--font-body);
    }
    .btn-primary { background: var(--accent-600); color: white; box-shadow: 0 2px 8px rgba(13, 115, 119, 0.2); }
    .btn-primary:hover:not(:disabled) { background: var(--accent-500); transform: translateY(-1px); box-shadow: var(--shadow-accent); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .spinner-sm {
      width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .submit-btn { margin-top: 8px; }

    @media (min-width: 768px) {
      .submit-page { padding: 2rem 0; }
      .form-row { grid-template-columns: 1fr 1fr; gap: 16px; }
      .type-selector { grid-template-columns: repeat(4, 1fr); }
    }
  `]
})
export class SubmitReviewComponent implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  selectedSeverity = signal<number | null>(null);
  submitting = signal(false);
  submitted = signal(false);
  prefilledEntityId: string | null = null;
  evidenceFiles: File[] = [];

  form!: FormGroup;

  ngOnInit(): void {
    this.prefilledEntityId = this.route.snapshot.paramMap.get('entityId');

    this.form = this.fb.group({
      entityName: ['', Validators.required],
      contactPhoneUsed: [''],
      contactWeChatUsed: [''],
      transactionRole: ['', Validators.required],
      productCategory: [''],
      incidentDate: ['', Validators.required],
      severity: [null, Validators.required],
      title: ['', [Validators.required, Validators.minLength(5)]],
      narrative: ['', [Validators.required, Validators.minLength(100)]],
      product: [''],
      orderValue: [null],
      verificationEmail: ['', [Validators.required, Validators.email]],
      confirmed: [false, Validators.requiredTrue],
    });

    if (this.prefilledEntityId) {
      // Load entity name
      this.apiService.get<any>(`entities/${this.prefilledEntityId}`).subscribe({
        next: (entity) => {
          this.form.patchValue({ entityName: entity.legalName });
        },
      });
    }

    // Auto-fill verification email with logged-in user's email
    const currentUser = this.authService.currentUser();
    if (currentUser?.email) {
      this.form.patchValue({ verificationEmail: currentUser.email });
    }
  }

  selectSeverity(level: number): void {
    this.selectedSeverity.set(level);
    this.form.patchValue({ severity: level });
  }

  onFilesSelected(files: File[]): void {
    this.evidenceFiles = files;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!control && control.invalid && (control.touched || this.submitted());
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (!this.form.valid || this.submitting()) return;

    this.submitting.set(true);
    const formValue = this.form.value;

    const reviewData: any = {
      reviewerType: 0, // FirstParty
      transactionRole: formValue.transactionRole,
      severity: formValue.severity,
      title: formValue.title,
      narrative: formValue.narrative,
      product: formValue.product,
      productCategory: formValue.productCategory,
      incidentDate: formValue.incidentDate,
      orderValue: formValue.orderValue,
      contactPhoneUsed: formValue.contactPhoneUsed,
      contactWeChatUsed: formValue.contactWeChatUsed,
      verificationEmail: formValue.verificationEmail,
    };

    // Send entity ID if pre-selected, otherwise send entity name
    if (this.prefilledEntityId) {
      reviewData.tradeEntityId = this.prefilledEntityId;
    } else {
      reviewData.entityName = formValue.entityName;
    }

    this.apiService.post<any>('reviews', reviewData).subscribe({
      next: (result) => {
        // Upload evidence files if any
        if (this.evidenceFiles.length > 0 && result?.data) {
          this.uploadEvidence(result.data);
        } else {
          this.submitting.set(false);
          alert('Review submitted successfully! It will be reviewed by our team.');
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        let msg = 'Unknown error';
        if (err?.error?.errors) {
          // Validation errors come as { "PropertyName": ["msg1", "msg2"], ... }
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
        alert('Failed to submit review:\n' + msg);
      },
    });
  }

  private uploadEvidence(reviewId: string): void {
    const formData = new FormData();
    this.evidenceFiles.forEach(f => formData.append('files', f));

    this.apiService.upload<any>(`reviews/${reviewId}/evidence`, formData).subscribe({
      next: () => {
        this.submitting.set(false);
        alert('Review submitted successfully with evidence!');
        this.router.navigate(['/']);
      },
      error: () => {
        this.submitting.set(false);
        alert('Review submitted but evidence upload failed.');
        this.router.navigate(['/']);
      },
    });
  }
}
