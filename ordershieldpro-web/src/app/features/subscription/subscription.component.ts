import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import {
  CurrentSubscription,
  SubscriptionPricing,
  SubscriptionRequest,
  SubscriptionRequestStatus,
  DurationOption
} from '../../core/models/subscription.model';
import { SubscriptionTier } from '../../core/enums';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [RouterLink, DatePipe, TranslateModule, LoadingSpinnerComponent],
  template: `
    <div class="subscription-page">
      <!-- Page Header -->
      <div class="page-header">
        <a routerLink="/profile" class="back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {{ 'subscription.backToProfile' | translate }}
        </a>
        <h1 class="page-title">{{ 'subscription.manageTitle' | translate }}</h1>
        <p class="page-subtitle">{{ 'subscription.manageSubtitle' | translate }}</p>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <!-- Current Plan Card -->
        <div class="current-plan-card">
          <div class="plan-header-row">
            <div>
              <span class="plan-tier-badge" [class]="'tier-' + currentTierClass()">
                {{ getTierLabel(current()?.tier) }}
              </span>
              <h2 class="current-plan-name">{{ 'subscription.currentPlan' | translate }}</h2>
            </div>
            <div class="expiry-info">
              @if (current()?.expiryDate) {
                <span class="expiry-label">{{ 'subscription.expiresOn' | translate }}</span>
                <span class="expiry-date" [class.expiring-soon]="isExpiringSoon()">
                  {{ current()!.expiryDate | date:'mediumDate' }}
                </span>
              }
            </div>
          </div>
          @if (isExpiringSoon()) {
            <div class="expiry-warning">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 5.333V8M8 10.667h.007M14 8A6 6 0 112 8a6 6 0 0112 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {{ 'subscription.expiryWarning' | translate }}
            </div>
          }
          @if (hasPendingRequest()) {
            <div class="pending-notice">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3l2 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {{ 'subscription.pendingNotice' | translate }}
            </div>
          }
        </div>

        <!-- Pricing Section -->
        @if (!hasPendingRequest()) {
          <div class="pricing-section">
            <div class="section-header-row">
              <div>
                <h2 class="section-heading">{{ 'subscription.choosePlan' | translate }}</h2>
                <p class="section-desc">{{ 'subscription.choosePlanDesc' | translate }}</p>
              </div>
              <div class="currency-selector">
                <label class="currency-label">{{ 'subscription.currency' | translate }}</label>
                <div class="currency-buttons">
                  @for (c of currencies; track c.code) {
                    <button class="currency-btn" [class.active]="selectedCurrency() === c.code" (click)="setCurrency(c.code)">
                      {{ c.code }}
                    </button>
                  }
                </div>
              </div>
            </div>

            @for (plan of pricing(); track plan.tier) {
              <div class="pricing-card" [class.highlighted]="plan.tier === 1">
                @if (plan.tier === 1) {
                  <div class="popular-ribbon">{{ 'subscription.popular' | translate }}</div>
                }
                <div class="pricing-card-header">
                  <h3 class="pricing-plan-name">{{ plan.planName }}</h3>
                  <div class="pricing-annual">
                    <span class="annual-amount">{{ convertPrice(plan.annualPrice) }}</span>
                    <span class="annual-label">{{ 'subscription.perYear' | translate }}</span>
                  </div>
                </div>

                <div class="duration-options">
                  @for (opt of plan.options; track opt.years) {
                    <button
                      class="duration-option"
                      [class.selected]="selectedTier() === plan.tier && selectedYears() === opt.years"
                      (click)="selectPlan(plan.tier, opt.years, opt.totalPrice)">
                      <div class="dur-left">
                        <span class="dur-years">{{ opt.years }} {{ opt.years === 1 ? ('subscription.year' | translate) : ('subscription.years' | translate) }}</span>
                        @if (opt.discountPercent > 0) {
                          <span class="dur-discount">{{ 'subscription.save' | translate }} {{ opt.discountPercent }}%</span>
                        }
                      </div>
                      <div class="dur-right">
                        <span class="dur-price">{{ convertPrice(opt.totalPrice) }}</span>
                        @if (opt.savedAmount > 0) {
                          <span class="dur-saved">{{ 'subscription.youSave' | translate }} {{ convertPrice(opt.savedAmount) }}</span>
                        }
                      </div>
                      <div class="dur-check">
                        @if (selectedTier() === plan.tier && selectedYears() === opt.years) {
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="var(--accent-600)"/><path d="M6 10l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        } @else {
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="var(--surface-border)" stroke-width="1.5"/></svg>
                        }
                      </div>
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Payment Method Selector -->
          @if (selectedTier() !== null) {
            <div class="payment-method-section">
              <h2 class="section-heading">{{ 'subscription.paymentMethod' | translate }}</h2>
              <p class="section-desc">{{ 'subscription.paymentMethodDesc' | translate }}</p>

              <div class="payment-methods">
                @for (method of paymentMethods; track method.id) {
                  <button
                    class="payment-method-btn"
                    [class.selected]="selectedPaymentMethod() === method.id"
                    (click)="selectedPaymentMethod.set(method.id)">
                    <span class="pm-icon">{{ method.icon }}</span>
                    <span class="pm-label">{{ method.labelKey | translate }}</span>
                    @if (selectedPaymentMethod() === method.id) {
                      <span class="pm-check">✓</span>
                    }
                  </button>
                }
              </div>

              @if (selectedPaymentMethod() && selectedPaymentMethod() !== 'bank_transfer') {
                <div class="online-payment-note">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 5.333V8M8 10.667h.007M14 8A6 6 0 112 8a6 6 0 0112 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  {{ 'subscription.onlinePaymentNote' | translate }}
                </div>
              }
            </div>
          }

          <!-- Upload Payment Proof (only for Bank Transfer) -->
          @if (selectedTier() !== null && selectedPaymentMethod() === 'bank_transfer') {
            <div class="upload-section">
              <h2 class="section-heading">{{ 'subscription.uploadProof' | translate }}</h2>
              <p class="section-desc">{{ 'subscription.bankTransferNote' | translate }}</p>

              <div
                class="file-dropzone"
                [class.has-file]="selectedFile()"
                [class.drag-over]="isDragOver()"
                (dragover)="onDragOver($event)"
                (dragleave)="isDragOver.set(false)"
                (drop)="onDrop($event)"
                (click)="fileInput.click()">
                <input
                  #fileInput
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf"
                  (change)="onFileSelected($event)"
                  style="display:none" />

                @if (selectedFile()) {
                  <div class="file-preview">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span class="file-name">{{ selectedFile()!.name }}</span>
                    <span class="file-size">({{ formatFileSize(selectedFile()!.size) }})</span>
                    <button class="remove-file" (click)="removeFile($event)">✕</button>
                  </div>
                } @else {
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <p class="dropzone-text">{{ 'subscription.dropzoneText' | translate }}</p>
                  <p class="dropzone-hint">{{ 'subscription.dropzoneHint' | translate }}</p>
                }
              </div>

              <!-- Payment Notes -->
              <div class="notes-field">
                <label class="field-label">{{ 'subscription.paymentNotes' | translate }}</label>
                <textarea
                  class="notes-textarea"
                  rows="3"
                  [placeholder]="'subscription.paymentNotesPlaceholder' | translate"
                  (input)="paymentNotes.set($any($event.target).value)">
                </textarea>
              </div>

              <!-- Submit Button -->
              <button
                class="btn-submit"
                [disabled]="!canSubmit() || submitting()"
                (click)="submitRequest()">
                @if (submitting()) {
                  <span class="spinner"></span>
                }
                {{ 'subscription.submitRequest' | translate }}
              </button>

              @if (submitError()) {
                <div class="error-msg">{{ submitError() }}</div>
              }
            </div>
          }

          <!-- Submit Button for online payment methods (no proof needed) -->
          @if (selectedTier() !== null && selectedPaymentMethod() && selectedPaymentMethod() !== 'bank_transfer') {
            <div class="upload-section">
              <button
                class="btn-submit"
                [disabled]="!canSubmitOnline() || submitting()"
                (click)="submitRequest()">
                @if (submitting()) {
                  <span class="spinner"></span>
                }
                {{ 'subscription.submitRequest' | translate }}
              </button>

              @if (submitError()) {
                <div class="error-msg">{{ submitError() }}</div>
              }
            </div>
          }
        }

        <!-- Request History -->
        @if (requests().length > 0) {
          <div class="history-section">
            <h2 class="section-heading">{{ 'subscription.requestHistory' | translate }}</h2>
            @for (req of requests(); track req.id) {
              <div class="history-card">
                <div class="history-header">
                  <div class="history-left">
                    <span class="history-tier" [class]="'tier-' + tierClass(req.requestedTier)">
                      {{ getTierLabel(req.requestedTier) }}
                    </span>
                    <span class="history-duration">{{ req.durationYears }} {{ req.durationYears === 1 ? ('subscription.year' | translate) : ('subscription.years' | translate) }}</span>
                  </div>
                  <span class="status-badge" [class]="'status-' + getStatusClass(req.status)">
                    {{ getStatusLabel(req.status) }}
                  </span>
                </div>
                <div class="history-details">
                  <div class="history-detail">
                    <span class="detail-label">{{ 'subscription.amount' | translate }}</span>
                    <span class="detail-value">{{ convertPrice(req.totalAmount, 2) }}</span>
                  </div>
                  <div class="history-detail">
                    <span class="detail-label">{{ 'subscription.submittedOn' | translate }}</span>
                    <span class="detail-value">{{ req.createdAt | date:'mediumDate' }}</span>
                  </div>
                  @if (req.adminNotes) {
                    <div class="history-detail full-width" [class.rejection-notice]="req.status === 2">
                      <span class="detail-label">
                        @if (req.status === 2) {
                          {{ 'subscription.rejectionMessage' | translate }}
                        } @else {
                          {{ 'subscription.adminNotes' | translate }}
                        }
                      </span>
                      <span class="detail-value" [class.rejection-text]="req.status === 2">{{ req.adminNotes }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .subscription-page {
      max-width: 720px;
      margin: 0 auto;
      padding: 24px 16px 80px;
    }

    /* Page Header */
    .back-link {
      display: inline-flex; align-items: center; gap: 4px;
      color: var(--text-tertiary); text-decoration: none; font-size: 13px;
      margin-bottom: 12px; transition: color var(--transition-fast);
    }
    :host-context([dir="rtl"]) .back-link svg {
      transform: scaleX(-1);
    }
    .back-link:hover { color: var(--accent-600); }
    .page-title {
      font-family: var(--font-display); font-size: 26px; font-weight: 800;
      color: var(--text-primary); margin: 0 0 6px;
    }
    .page-subtitle { font-size: 14px; color: var(--text-tertiary); margin: 0 0 24px; }

    /* Current Plan Card */
    .current-plan-card {
      background: var(--surface-0); border-radius: var(--radius-lg); padding: 20px;
      box-shadow: var(--shadow-sm); border: 1px solid var(--surface-border-subtle);
      margin-bottom: 24px;
    }
    .plan-header-row { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
    .plan-tier-badge {
      display: inline-block; padding: 3px 12px; border-radius: var(--radius-full);
      font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
      margin-bottom: 6px;
    }
    .tier-free { background: var(--surface-100); color: var(--text-secondary); }
    .tier-pro { background: var(--accent-100); color: var(--accent-600); }

    .current-plan-name { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .expiry-info { text-align: end; }
    .expiry-label { display: block; font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; }
    .expiry-date { font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .expiry-date.expiring-soon { color: var(--severity-warning); }
    .expiry-warning {
      display: flex; align-items: center; gap: 8px; margin-top: 12px;
      padding: 10px 14px; border-radius: var(--radius-md);
      background: var(--severity-warning-bg); color: var(--severity-warning);
      font-size: 13px; font-weight: 600;
    }
    .pending-notice {
      display: flex; align-items: center; gap: 8px; margin-top: 12px;
      padding: 10px 14px; border-radius: var(--radius-md);
      background: var(--severity-info-bg); color: var(--severity-info);
      font-size: 13px; font-weight: 600;
    }

    /* Section Heading */
    .section-heading {
      font-family: var(--font-display); font-size: 20px; font-weight: 800;
      color: var(--text-primary); margin: 0 0 4px;
    }
    .section-desc { font-size: 13px; color: var(--text-tertiary); margin: 0 0 16px; }

    /* Section Header Row + Currency Selector */
    .section-header-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      flex-wrap: wrap; gap: 12px; margin-bottom: 16px;
    }
    .section-header-row .section-desc { margin-bottom: 0; }
    .currency-selector { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    :host-context([dir="rtl"]) .currency-selector { align-items: flex-start; }
    .currency-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
    .currency-buttons { display: flex; gap: 4px; }
    .currency-btn {
      padding: 5px 12px; border: 1.5px solid var(--surface-border); border-radius: var(--radius-full);
      background: var(--surface-0); color: var(--text-secondary); font-family: var(--font-body);
      font-size: 12px; font-weight: 700; cursor: pointer; transition: all var(--transition-fast);
      letter-spacing: 0.02em;
    }
    .currency-btn:hover { border-color: var(--accent-300); color: var(--accent-600); }
    .currency-btn.active {
      background: var(--accent-600); color: white; border-color: var(--accent-600);
    }

    /* Pricing Cards */
    .pricing-section { margin-bottom: 24px; }
    .pricing-card {
      background: var(--surface-0); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm); border: 2px solid var(--surface-border);
      margin-bottom: 16px; overflow: hidden; position: relative;
      transition: all var(--transition-base);
    }
    .pricing-card:hover { box-shadow: var(--shadow-md); }
    .pricing-card.highlighted { border-color: var(--accent-500); }
    .popular-ribbon {
      position: absolute; top: 0; inset-inline-end: 24px;
      background: var(--accent-600); color: white; font-size: 10px; font-weight: 700;
      padding: 4px 12px; border-radius: 0 0 var(--radius-sm) var(--radius-sm);
      letter-spacing: 0.05em; text-transform: uppercase;
    }
    .pricing-card-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 20px 12px; flex-wrap: wrap; gap: 8px;
    }
    .pricing-plan-name { font-family: var(--font-display); font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 0; }
    .pricing-annual { text-align: end; }
    .annual-amount { font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--navy-900); }
    .annual-label { display: block; font-size: 12px; color: var(--text-tertiary); }

    /* Duration Options */
    .duration-options { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 8px; }
    .duration-option {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      border: 2px solid var(--surface-border); border-radius: var(--radius-md);
      background: var(--surface-0); cursor: pointer; transition: all var(--transition-fast);
      text-align: start; width: 100%; font-family: var(--font-body); font-size: 14px;
    }
    .duration-option:hover { border-color: var(--accent-300); background: var(--accent-50); }
    .duration-option.selected { border-color: var(--accent-600); background: var(--accent-50); }
    .dur-left { flex: 1; }
    .dur-years { font-weight: 700; color: var(--text-primary); }
    .dur-discount {
      display: inline-block; margin-inline-start: 8px; padding: 1px 8px;
      background: var(--success-bg); color: var(--success); font-size: 11px;
      font-weight: 700; border-radius: var(--radius-full);
    }
    .dur-right { text-align: end; }
    .dur-price { font-weight: 700; font-size: 16px; color: var(--navy-900); font-family: var(--font-display); }
    .dur-saved { display: block; font-size: 11px; color: var(--success); }
    .dur-check { flex-shrink: 0; }

    /* Payment Methods */
    .payment-method-section {
      background: var(--surface-0); border-radius: var(--radius-lg); padding: 24px;
      box-shadow: var(--shadow-sm); border: 1px solid var(--surface-border-subtle);
      margin-bottom: 24px;
    }
    .payment-methods {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px;
    }
    .payment-method-btn {
      display: flex; align-items: center; gap: 10px; padding: 14px 16px;
      border: 2px solid var(--surface-border); border-radius: var(--radius-md);
      background: var(--surface-0); cursor: pointer; transition: all var(--transition-fast);
      font-family: var(--font-body); font-size: 14px; font-weight: 600; color: var(--text-primary);
      position: relative;
    }
    .payment-method-btn:hover { border-color: var(--accent-300); background: var(--accent-50); }
    .payment-method-btn.selected { border-color: var(--accent-600); background: var(--accent-50); }
    .pm-icon { font-size: 22px; }
    .pm-label { flex: 1; }
    .pm-check {
      position: absolute; top: 6px; inset-inline-end: 8px; width: 20px; height: 20px;
      background: var(--accent-600); color: white; border-radius: 50%; font-size: 12px;
      display: flex; align-items: center; justify-content: center; font-weight: 700;
    }
    .online-payment-note {
      display: flex; align-items: center; gap: 8px; margin-top: 12px;
      padding: 10px 14px; border-radius: var(--radius-md);
      background: var(--severity-info-bg); color: var(--severity-info);
      font-size: 13px; font-weight: 600;
    }

    /* Rejection Notice */
    .rejection-notice {
      background: var(--danger-bg); border-radius: var(--radius-md); padding: 10px 14px !important;
      border: 1px solid #fecaca;
    }
    .rejection-text { color: var(--danger) !important; font-weight: 700 !important; }

    /* Upload Section */
    .upload-section {
      background: var(--surface-0); border-radius: var(--radius-lg); padding: 24px;
      box-shadow: var(--shadow-sm); border: 1px solid var(--surface-border-subtle);
      margin-bottom: 24px;
    }
    .file-dropzone {
      border: 2px dashed var(--surface-border); border-radius: var(--radius-md);
      padding: 32px; text-align: center; cursor: pointer;
      transition: all var(--transition-fast); margin-bottom: 16px;
    }
    .file-dropzone:hover, .file-dropzone.drag-over {
      border-color: var(--accent-400); background: var(--accent-50);
    }
    .file-dropzone.has-file { border-color: var(--accent-500); background: var(--accent-50); border-style: solid; }
    .file-dropzone svg { color: var(--text-muted); margin-bottom: 8px; }
    .dropzone-text { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 8px 0 4px; }
    .dropzone-hint { font-size: 12px; color: var(--text-tertiary); margin: 0; }
    .file-preview {
      display: flex; align-items: center; gap: 10px; justify-content: center;
    }
    .file-preview svg { color: var(--accent-600); flex-shrink: 0; }
    .file-name { font-weight: 600; color: var(--text-primary); font-size: 14px; word-break: break-all; }
    .file-size { font-size: 12px; color: var(--text-tertiary); }
    .remove-file {
      background: var(--danger-bg); color: var(--danger); border: none;
      width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
      font-size: 12px; display: flex; align-items: center; justify-content: center;
      transition: background var(--transition-fast);
    }
    .remove-file:hover { background: #fecaca; }

    /* Notes */
    .notes-field { margin-bottom: 16px; }
    .field-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
    .notes-textarea {
      width: 100%; border: 1.5px solid var(--surface-border); border-radius: var(--radius-md);
      padding: 10px 12px; font-family: var(--font-body); font-size: 14px; color: var(--text-primary);
      resize: vertical; background: var(--surface-0);
      transition: border-color var(--transition-fast);
    }
    .notes-textarea:focus { border-color: var(--accent-400); outline: none; }
    .notes-textarea::placeholder { color: var(--text-muted); }

    /* Submit Button */
    .btn-submit {
      width: 100%; padding: 14px; border: none; border-radius: var(--radius-md);
      background: var(--accent-600); color: white; font-family: var(--font-body);
      font-size: 15px; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all var(--transition-fast);
    }
    .btn-submit:hover:not(:disabled) { background: var(--accent-500); box-shadow: var(--shadow-accent); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .spinner {
      width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error-msg {
      margin-top: 12px; padding: 10px 14px; border-radius: var(--radius-md);
      background: var(--danger-bg); color: var(--danger); font-size: 13px; font-weight: 600;
    }

    /* History */
    .history-section { margin-bottom: 24px; }
    .history-card {
      background: var(--surface-0); border-radius: var(--radius-lg); overflow: hidden;
      box-shadow: var(--shadow-sm); border: 1px solid var(--surface-border-subtle);
      margin-bottom: 12px;
    }
    .history-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; border-bottom: 1px solid var(--surface-100);
    }
    .history-left { display: flex; align-items: center; gap: 10px; }
    .history-tier {
      display: inline-block; padding: 2px 10px; border-radius: var(--radius-full);
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
    }
    .history-duration { font-size: 13px; color: var(--text-secondary); font-weight: 600; }
    .status-badge {
      padding: 3px 10px; border-radius: var(--radius-full); font-size: 11px;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
    }
    .status-pending { background: var(--severity-warning-bg); color: var(--severity-warning); }
    .status-approved { background: var(--success-bg); color: var(--success); }
    .status-rejected { background: var(--danger-bg); color: var(--danger); }
    .history-details {
      padding: 14px 20px; display: flex; flex-wrap: wrap; gap: 16px;
    }
    .history-detail { min-width: 120px; }
    .history-detail.full-width { width: 100%; }
    .detail-label { display: block; font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
    .detail-value { font-size: 14px; font-weight: 600; color: var(--text-primary); }

    @media (min-width: 768px) {
      .subscription-page { max-width: 720px; padding: 32px 0 64px; }
      .page-title { font-size: 30px; }
    }
  `]
})
export class SubscriptionComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  authService = inject(AuthService);

  currencies = [
    { code: 'USD', symbol: '$', rate: 1 },
    { code: 'SAR', symbol: '﷼', rate: 3.75 },
    { code: 'CNY', symbol: '¥', rate: 7.25 }
  ];

  paymentMethods = [
    { id: 'bank_transfer', icon: '🏦', labelKey: 'subscription.methodBankTransfer' },
    { id: 'mastercard', icon: '💳', labelKey: 'subscription.methodMasterCard' },
    { id: 'paypal', icon: '🅿️', labelKey: 'subscription.methodPayPal' },
    { id: 'mada', icon: '💳', labelKey: 'subscription.methodMada' },
    { id: 'alipay', icon: '🔵', labelKey: 'subscription.methodAlipay' },
  ];

  selectedPaymentMethod = signal<string | null>(null);
  selectedCurrency = signal<string>(localStorage.getItem('osp_currency') || 'USD');

  loading = signal(true);
  current = signal<CurrentSubscription | null>(null);
  pricing = signal<SubscriptionPricing[]>([]);
  requests = signal<SubscriptionRequest[]>([]);

  selectedTier = signal<SubscriptionTier | null>(null);
  selectedYears = signal<number>(1);
  selectedPrice = signal<number>(0);
  selectedFile = signal<File | null>(null);
  paymentNotes = signal('');
  isDragOver = signal(false);

  submitting = signal(false);
  submitError = signal<string | null>(null);

  canSubmit = computed(() => this.selectedTier() !== null && this.selectedFile() !== null && this.selectedPaymentMethod() === 'bank_transfer');
  canSubmitOnline = computed(() => this.selectedTier() !== null && this.selectedPaymentMethod() !== null && this.selectedPaymentMethod() !== 'bank_transfer');

  hasPendingRequest = computed(() =>
    this.requests().some(r => r.status === SubscriptionRequestStatus.Pending)
  );

  currentTierClass = computed(() => this.tierClass(this.current()?.tier ?? SubscriptionTier.Free));

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    // Load all data in parallel
    this.api.get<CurrentSubscription>('subscriptions/current').subscribe({
      next: (data) => this.current.set(data),
      error: () => {}
    });

    this.api.get<SubscriptionPricing[]>('subscriptions/pricing').subscribe({
      next: (data) => this.pricing.set(data),
      error: () => {}
    });

    this.api.get<SubscriptionRequest[]>('subscriptions/my-requests').subscribe({
      next: (data) => {
        this.requests.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  selectPlan(tier: SubscriptionTier, years: number, price: number): void {
    this.selectedTier.set(tier);
    this.selectedYears.set(years);
    this.selectedPrice.set(price);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.setFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files?.length) {
      this.setFile(event.dataTransfer.files[0]);
    }
  }

  private setFile(file: File): void {
    if (file.size > 10 * 1024 * 1024) {
      this.submitError.set(this.translate.instant('subscription.fileTooLarge'));
      return;
    }
    this.selectedFile.set(file);
    this.submitError.set(null);
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile.set(null);
  }

  submitRequest(): void {
    const isBankTransfer = this.selectedPaymentMethod() === 'bank_transfer';
    if (isBankTransfer && !this.canSubmit()) return;
    if (!isBankTransfer && !this.canSubmitOnline()) return;

    this.submitting.set(true);
    this.submitError.set(null);

    const formData = new FormData();
    formData.append('requestedTier', this.selectedTier()!.toString());
    formData.append('durationYears', this.selectedYears().toString());
    if (isBankTransfer && this.selectedFile()) {
      formData.append('paymentProof', this.selectedFile()!, this.selectedFile()!.name);
    }
    if (this.paymentNotes()) {
      formData.append('paymentNotes', this.paymentNotes());
    }
    formData.append('paymentMethod', this.selectedPaymentMethod()!);

    this.api.upload<{ id: string }>('subscriptions/request', formData).subscribe({
      next: () => {
        this.submitting.set(false);
        this.selectedTier.set(null);
        this.selectedFile.set(null);
        this.paymentNotes.set('');
        this.selectedPaymentMethod.set(null);
        this.loadData(); // Reload to show new request
      },
      error: (err) => {
        this.submitting.set(false);
        const errors = err?.error?.errors;
        this.submitError.set(
          Array.isArray(errors) ? errors.join(', ') : (errors || this.translate.instant('subscription.submitError'))
        );
      }
    });
  }

  isExpiringSoon(): boolean {
    if (!this.current()?.expiryDate) return false;
    const expiry = new Date(this.current()!.expiryDate!);
    const daysLeft = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 30;
  }

  getTierLabel(tier?: SubscriptionTier): string {
    switch (tier) {
      case SubscriptionTier.Pro: return 'Pro';
      default: return 'Free';
    }
  }

  tierClass(tier: SubscriptionTier): string {
    switch (tier) {
      case SubscriptionTier.Pro: return 'pro';
      default: return 'free';
    }
  }

  getStatusClass(status: SubscriptionRequestStatus): string {
    switch (status) {
      case SubscriptionRequestStatus.Approved: return 'approved';
      case SubscriptionRequestStatus.Rejected: return 'rejected';
      default: return 'pending';
    }
  }

  getStatusLabel(status: SubscriptionRequestStatus): string {
    switch (status) {
      case SubscriptionRequestStatus.Approved: return this.translate.instant('subscription.statusApproved');
      case SubscriptionRequestStatus.Rejected: return this.translate.instant('subscription.statusRejected');
      default: return this.translate.instant('subscription.statusPending');
    }
  }

  convertPrice(usdAmount: number, decimals: number = 0): string {
    const curr = this.currencies.find(c => c.code === this.selectedCurrency()) || this.currencies[0];
    const converted = usdAmount * curr.rate;
    const formatted = decimals > 0 ? converted.toFixed(decimals) : Math.round(converted).toLocaleString();
    return `${curr.symbol}${formatted}`;
  }

  setCurrency(code: string): void {
    this.selectedCurrency.set(code);
    localStorage.setItem('osp_currency', code);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
