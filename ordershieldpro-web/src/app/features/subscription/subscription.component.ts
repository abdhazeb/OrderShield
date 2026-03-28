import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { FileSizePipe } from '../../shared/pipes/file-size.pipe';
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
  imports: [RouterLink, DatePipe, TranslateModule, LoadingSpinnerComponent, FileSizePipe],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
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

}
