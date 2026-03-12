import { Component, inject, OnInit, OnDestroy, signal, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, takeUntil, tap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { SeverityLevel } from '../../core/enums';
import { EntitySearchResult, EntityDetail, PaginatedResult } from '../../core/models';

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
        <p>{{ 'review.infoAlert' | translate }}</p>
      </div>

      <!-- Mode Selector: Review vs Comment -->
      <div class="mode-selector">
        <button type="button" class="mode-btn" [class.active]="submissionMode() === 'review'" (click)="setMode('review')">
          ✍️ {{ 'review.submitReview' | translate }}
        </button>
        <button type="button" class="mode-btn" [class.active]="submissionMode() === 'comment'" (click)="setMode('comment')">
          💬 {{ 'review.addComment' | translate }}
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="review-form">

        <!-- Row 1: Legal Name + Contact Name -->
        <div class="form-row">
          <div class="form-group entity-autocomplete">
            <label class="form-label">{{ 'entity.legalName' | translate }} *</label>
            <div class="autocomplete-wrapper">
              <input class="form-input" [class.input-error]="isFieldInvalid('entityName')" type="text"
                     formControlName="entityName" [placeholder]="'review.placeholder.entityName' | translate"
                     (input)="onEntityNameInput($event)" (focus)="onEntityFieldFocus()"
                     (blur)="onEntityFieldBlur()" autocomplete="off" />
              @if (entitySearching()) {
                <span class="autocomplete-spinner"></span>
              }
              @if (showSuggestions() && entitySuggestions().length > 0) {
                <div class="suggestions-dropdown">
                  @for (entity of entitySuggestions(); track entity.id) {
                    <button type="button" class="suggestion-item" (mousedown)="selectEntity(entity)">
                      <div class="suggestion-name">{{ entity.legalName }}</div>
                      <div class="suggestion-meta">
                        <span class="suggestion-type">{{ entity.entityType }}</span>
                        <span class="suggestion-country">{{ entity.country }}</span>
                        @if (entity.totalReviewCount > 0) {
                          <span class="suggestion-reviews">{{ 'review.reviewCount' | translate:{ count: entity.totalReviewCount } }}</span>
                        }
                      </div>
                    </button>
                  }
                </div>
              }
            </div>
            @if (isFieldInvalid('entityName')) {
              <div class="field-error">{{ 'validation.entityNameRequired' | translate }}</div>
            }
            @if (prefilledEntityId) {
              <div class="entity-selected-badge">
                <span class="badge-icon">✓</span>
                <span>{{ 'review.entityPreSelected' | translate }}</span>
                <button type="button" class="clear-entity" (click)="clearSelectedEntity()">✕</button>
              </div>
            }
          </div>
          <div class="form-group">
            <label class="form-label">{{ 'review.contactName' | translate }}</label>
            <input class="form-input" type="text" formControlName="contactName" [placeholder]="'review.placeholder.contactName' | translate" />
          </div>
        </div>

        <!-- Country & Province (for new suppliers) -->
        @if (submissionMode() === 'review' && !prefilledEntityId) {
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ 'review.supplierCountry' | translate }} *</label>
              <input class="form-input" [class.input-error]="isFieldInvalid('supplierCountry')" type="text" formControlName="supplierCountry" [placeholder]="'review.placeholder.country' | translate" list="countryList" />
              <datalist id="countryList">
                @for (c of countryOptions; track c.name) {
                  <option [value]="c.name"></option>
                }
              </datalist>
              @if (isFieldInvalid('supplierCountry')) {
                <div class="field-error">{{ 'validation.countryRequired' | translate }}</div>
              }
            </div>
            <div class="form-group">
              <label class="form-label">{{ 'review.supplierProvince' | translate }}</label>
              <input class="form-input" type="text" formControlName="supplierProvince" [placeholder]="'review.placeholder.province' | translate" />
            </div>
          </div>
        }

        @if (submissionMode() === 'review') {
          <!-- Contact Phone (with country code) & Incident Date -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ 'review.contactPhone' | translate }}</label>
              <div class="phone-input-wrapper">
                <span class="phone-code-prefix">{{ countryDialCode() }}</span>
                <input class="form-input phone-input-with-code" type="tel" formControlName="contactPhoneUsed" [placeholder]="'review.placeholder.phoneNumber' | translate" />
              </div>
              <div class="form-help">{{ 'review.formHelp.phone' | translate }}</div>
            </div>
            <div class="form-group">
              <label class="form-label">{{ 'review.incidentDate' | translate }}</label>
              <input class="form-input" type="date" formControlName="incidentDate" />
            </div>
          </div>

          <!-- Product Category & Product -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ 'review.productCategory' | translate }} *</label>
              <select class="form-select" [class.input-error]="isFieldInvalid('productCategory')" formControlName="productCategory">
                <option value="">{{ 'review.selectCategory' | translate }}</option>
                <option value="Auto">{{ 'productCategory.auto' | translate }}</option>
                <option value="Bags & Cases">{{ 'productCategory.bagsCases' | translate }}</option>
                <option value="Building">{{ 'productCategory.building' | translate }}</option>
                <option value="Chemical">{{ 'productCategory.chemical' | translate }}</option>
                <option value="Computer Products">{{ 'productCategory.computerProducts' | translate }}</option>
                <option value="Consumer Electronics">{{ 'productCategory.consumerElectronics' | translate }}</option>
                <option value="Electrics & Electronics">{{ 'productCategory.electricsElectronics' | translate }}</option>
                <option value="Energy">{{ 'productCategory.energy' | translate }}</option>
                <option value="Fashion Accessories">{{ 'productCategory.fashionAccessories' | translate }}</option>
                <option value="Food & Beverage">{{ 'productCategory.foodBeverage' | translate }}</option>
                <option value="Furniture">{{ 'productCategory.furniture' | translate }}</option>
                <option value="Garment">{{ 'productCategory.garment' | translate }}</option>
                <option value="Gifts & Crafts">{{ 'productCategory.giftsCrafts' | translate }}</option>
                <option value="Hardware">{{ 'productCategory.hardware' | translate }}</option>
                <option value="Health & Medical">{{ 'productCategory.healthMedical' | translate }}</option>
                <option value="Home & Garden">{{ 'productCategory.homeGarden' | translate }}</option>
                <option value="Home Appliances">{{ 'productCategory.homeAppliances' | translate }}</option>
                <option value="Kitchenware & Tableware">{{ 'productCategory.kitchenwareTableware' | translate }}</option>
                <option value="Lights & Lighting">{{ 'productCategory.lightsLighting' | translate }}</option>
                <option value="Machinery">{{ 'productCategory.machinery' | translate }}</option>
                <option value="Other">{{ 'productCategory.other' | translate }}</option>
                <option value="Packaging & Printing">{{ 'productCategory.packagingPrinting' | translate }}</option>
                <option value="Personal Care">{{ 'productCategory.personalCare' | translate }}</option>
                <option value="Sanitary Ware">{{ 'productCategory.sanitaryWare' | translate }}</option>
                <option value="Shoes">{{ 'productCategory.shoes' | translate }}</option>
                <option value="Sports & Entertainment">{{ 'productCategory.sportsEntertainment' | translate }}</option>
                <option value="Stationery & Office Supplies">{{ 'productCategory.stationeryOffice' | translate }}</option>
                <option value="Textile">{{ 'productCategory.textile' | translate }}</option>
                <option value="Toys">{{ 'productCategory.toys' | translate }}</option>
              </select>
              @if (isFieldInvalid('productCategory')) {
                <div class="field-error">{{ 'validation.categoryRequired' | translate }}</div>
              }
            </div>
            <div class="form-group">
              <label class="form-label">{{ 'review.product' | translate }}</label>
              <input class="form-input" type="text" formControlName="product" [placeholder]="'review.placeholder.product' | translate" />
            </div>
          </div>

          <!-- Review Type & Title -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ 'review.reviewType' | translate }} *</label>
              <select class="form-select" [class.input-error]="isFieldInvalid('severity')" formControlName="severity">
                <option [ngValue]="null" disabled>{{ 'review.selectType' | translate }}</option>
                <option [ngValue]="0">{{ 'severity.info' | translate }}</option>
                <option [ngValue]="1">{{ 'severity.warning' | translate }}</option>
                <option [ngValue]="2">{{ 'severity.critical' | translate }}</option>
                <option [ngValue]="3">{{ 'severity.behavior' | translate }}</option>
                <option [ngValue]="4">{{ 'severity.fraud' | translate }}</option>
                <option [ngValue]="5">{{ 'severity.quality' | translate }}</option>
                <option [ngValue]="6">{{ 'severity.delivery' | translate }}</option>
                <option [ngValue]="7">{{ 'severity.payment' | translate }}</option>
                <option [ngValue]="8">{{ 'severity.financiallyDistressed' | translate }}</option>
                <option [ngValue]="9">{{ 'severity.bankrupt' | translate }}</option>
                <option [ngValue]="10">{{ 'severity.poorManagement' | translate }}</option>
                <option [ngValue]="11">{{ 'severity.inaccurateAppointments' | translate }}</option>
                <option [ngValue]="12">{{ 'severity.bribeOthers' | translate }}</option>
                <option [ngValue]="13">{{ 'severity.fakeSupplier' | translate }}</option>
                <option [ngValue]="14">{{ 'severity.other' | translate }}</option>
              </select>
              @if (isFieldInvalid('severity')) {
                <div class="field-error">{{ 'validation.selectReviewType' | translate }}</div>
              }
            </div>
            <div class="form-group">
              <label class="form-label">{{ 'review.title' | translate }} *</label>
              <input class="form-input" [class.input-error]="isFieldInvalid('title')" type="text" formControlName="title" [placeholder]="'review.placeholder.title' | translate" />
              @if (isFieldInvalid('title')) {
                <div class="field-error">
                  @if (form.get('title')?.errors?.['required']) {
                    {{ 'validation.titleRequired' | translate }}
                  } @else {
                    {{ 'validation.titleMinLength' | translate }}
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Narrative -->
        <div class="form-group">
          <label class="form-label">{{ submissionMode() === 'comment' ? ('review.commentNarrative' | translate) : ('review.narrative' | translate) }} *</label>
          <textarea class="form-textarea" [class.input-error]="isFieldInvalid('narrative')" formControlName="narrative"
                    [placeholder]="'review.placeholder.narrative' | translate"
                    rows="6"></textarea>
          <div class="form-help">
            {{ 'review.narrativeHint' | translate }}
            ({{ form.get('narrative')?.value?.length || 0 }}/{{ submissionMode() === 'comment' ? 10 : 50 }} min)
          </div>
          @if (isFieldInvalid('narrative') && form.get('narrative')?.errors?.['minlength']) {
            <div class="field-error">{{ 'validation.narrativeMinLength' | translate }}</div>
          }
        </div>

        @if (submissionMode() === 'review') {
          <!-- File Upload -->
          <div class="form-group">
            <label class="form-label">
              {{ 'review.uploadEvidence' | translate }} <span>*</span>
            </label>
            <app-file-upload (filesSelected)="onFilesSelected($event)" />
            @if (submitted() && evidenceFiles.length === 0) {
              <div class="field-error">{{ 'validation.evidenceRequired' | translate }}</div>
            }
          </div>
        }

        <!-- Confirmation -->
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" formControlName="confirmed" />
            <span>{{ 'review.confirmation' | translate }}</span>
          </label>
        </div>

        <!-- Submit -->
        @if (submitted() && !isFormReady()) {
          <div class="validation-summary">
            ⚠️ {{ 'review.validationSummary' | translate }}
          </div>
        }
        <button type="submit" class="btn btn-primary submit-btn"
                [class.btn-disabled]="!isFormReady()"
                [disabled]="submitting()">
          @if (submitting()) {
            <span class="spinner-sm"></span>
          }
          {{ submissionMode() === 'comment' ? ('review.addComment' | translate) : ('review.submitReview' | translate) }}
        </button>
      </form>
    </div>
  `,
  styles: [`
    .submit-page { padding: 16px; max-width: 860px; margin: 0 auto; }
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

    /* Mode Selector */
    .mode-selector {
      display: flex; gap: 8px; margin-bottom: 24px;
      background: var(--surface-100); border-radius: var(--radius-lg); padding: 4px;
    }
    .mode-btn {
      flex: 1; padding: 12px 16px; border: none; border-radius: var(--radius-md);
      background: transparent; color: var(--text-secondary); font-family: var(--font-body);
      font-size: 14px; font-weight: 700; cursor: pointer; transition: all var(--transition-fast);
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .mode-btn.active {
      background: var(--surface-0); color: var(--accent-600);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .mode-btn:hover:not(.active) { color: var(--text-primary); }

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
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    .input-error { border-color: var(--danger) !important; }
    .field-error { font-size: 12px; color: var(--danger); margin-top: 4px; font-weight: 500; }
    .validation-summary {
      background: var(--danger-bg); border: 1px solid #fecaca; border-radius: var(--radius-md);
      padding: 12px 16px; font-size: 14px; color: #991b1b; font-weight: 600;
      margin-bottom: 12px;
    }
    .btn-disabled { opacity: 0.6; }

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

    @media (max-width: 599px) {
      .form-row { grid-template-columns: 1fr; }
    }

    @media (min-width: 768px) {
      .submit-page { padding: 2rem 0; }
    }

    /* Autocomplete */
    .entity-autocomplete { position: relative; }
    .autocomplete-wrapper { position: relative; }
    .autocomplete-spinner {
      position: absolute; inset-inline-end: 12px; top: 50%; transform: translateY(-50%);
      width: 16px; height: 16px; border: 2px solid var(--surface-border);
      border-top-color: var(--accent-500); border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    .suggestions-dropdown {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
      background: var(--surface-0); border: 1.5px solid var(--accent-300);
      border-radius: 0 0 var(--radius-md) var(--radius-md); border-top: none;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 240px; overflow-y: auto;
    }
    .suggestion-item {
      width: 100%; display: block; padding: 10px 14px; border: none; background: none;
      cursor: pointer; text-align: start; font-family: var(--font-body);
      transition: background var(--transition-fast); border-bottom: 1px solid var(--surface-border);
    }
    .suggestion-item:last-child { border-bottom: none; }
    .suggestion-item:hover { background: var(--accent-50); }
    .suggestion-name { font-weight: 600; font-size: 14px; color: var(--text-primary); margin-bottom: 2px; }
    .suggestion-meta { display: flex; gap: 8px; font-size: 11px; color: var(--text-muted); }
    .suggestion-type { text-transform: capitalize; }
    .suggestion-reviews { color: var(--accent-600); font-weight: 500; }

    .entity-selected-badge {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 6px;
      padding: 4px 10px; border-radius: var(--radius-full); font-size: 12px;
      background: var(--accent-50); color: var(--accent-700); border: 1px solid var(--accent-200);
    }
    .badge-icon { color: var(--accent-500); font-weight: 700; }
    .clear-entity {
      background: none; border: none; cursor: pointer; font-size: 14px; color: var(--text-muted);
      padding: 0 2px; line-height: 1; transition: color var(--transition-fast);
    }
    .clear-entity:hover { color: var(--danger); }

    /* Phone with country code */
    .phone-input-wrapper {
      display: flex; align-items: stretch;
    }
    .phone-code-prefix {
      display: flex; align-items: center; padding: 0 12px;
      background: var(--surface-100); border: 1.5px solid var(--surface-border);
      border-inline-end: none; border-radius: var(--radius-md) 0 0 var(--radius-md);
      font-size: 14px; font-weight: 600; color: var(--text-secondary);
      white-space: nowrap; min-width: 48px; justify-content: center;
    }
    :host-context([dir="rtl"]) .phone-code-prefix {
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
    }
    .phone-input-with-code {
      border-radius: 0 var(--radius-md) var(--radius-md) 0 !important;
    }
    :host-context([dir="rtl"]) .phone-input-with-code {
      border-radius: var(--radius-md) 0 0 var(--radius-md) !important;
    }

    /* Additional RTL overrides */
    :host-context([dir="rtl"]) .form-label,
    :host-context([dir="rtl"]) .form-help,
    :host-context([dir="rtl"]) .field-error {
      text-align: right;
      direction: rtl;
    }
    :host-context([dir="rtl"]) .form-input,
    :host-context([dir="rtl"]) .form-textarea,
    :host-context([dir="rtl"]) .form-select {
      text-align: right;
      direction: rtl;
    }
    :host-context([dir="rtl"]) .checkbox-label {
      flex-direction: row-reverse;
    }
    :host-context([dir="rtl"]) .entity-selected-badge {
      flex-direction: row-reverse;
    }
    :host-context([dir="rtl"]) .suggestion-item {
      text-align: right;
    }
    :host-context([dir="rtl"]) .suggestion-meta {
      flex-direction: row-reverse;
    }
    :host-context([dir="rtl"]) .phone-input-wrapper {
      flex-direction: row-reverse;
    }
  `]
})
export class SubmitReviewComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);

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
  private destroy$ = new Subject<void>();

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
      takeUntil(this.destroy$)
    ).subscribe(country => {
      const match = this.countryOptions.find(c => c.name.toLowerCase() === (country || '').toLowerCase());
      this.countryDialCode.set(match ? match.code : '+');
    });

    // Setup autocomplete search pipeline
    this.searchSubject.pipe(
      takeUntil(this.destroy$),
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

    const reviewData: any = {
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
      reviewData.supplierCountry = formValue.supplierCountry;
      reviewData.supplierProvince = formValue.supplierProvince;
    }

    if (this.prefilledEntityId) {
      reviewData.tradeEntityId = this.prefilledEntityId;
    } else {
      reviewData.entityName = formValue.entityName;
    }

    this.apiService.post<any>('reviews', reviewData).subscribe({
      next: (result) => {
        if (this.evidenceFiles.length > 0 && result?.data) {
          this.uploadEvidence(result.data);
        } else {
          this.submitting.set(false);
          alert(this.translate.instant('review.successSubmitted'));
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
        alert(this.translate.instant('review.failedSubmit') + '\n' + msg);
      },
    });
  }

  private uploadEvidence(reviewId: string): void {
    const formData = new FormData();
    this.evidenceFiles.forEach(f => formData.append('files', f));

    this.apiService.upload<any>(`reviews/${reviewId}/evidence`, formData).subscribe({
      next: () => {
        this.submitting.set(false);
        alert(this.translate.instant('review.successWithEvidence'));
        this.router.navigate(['/']);
      },
      error: () => {
        this.submitting.set(false);
        alert(this.translate.instant('review.evidenceUploadFailed'));
        this.router.navigate(['/']);
      },
    });
  }
}
