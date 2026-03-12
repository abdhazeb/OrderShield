import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/services/auth.service';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="contact-page">
      <div class="contact-card">
        <button class="back-btn" routerLink="/">← {{ 'contact.backToHome' | translate }}</button>

        <div class="contact-header">
          <span class="logo">📩</span>
          <h1>{{ 'contact.title' | translate }}</h1>
          <p>{{ 'contact.subtitle' | translate }}</p>
        </div>

        @if (sent()) {
          <div class="success-card">
            <span class="success-icon">✅</span>
            <h2>{{ 'contact.sent' | translate }}</h2>
            <p>{{ 'contact.sentDesc' | translate }}</p>
            <a routerLink="/" class="btn btn-primary">{{ 'contact.backToHome' | translate }}</a>
          </div>
        } @else {
          @if (error()) {
            <div class="error-alert">{{ error() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label class="form-label">{{ 'contact.fullName' | translate }}</label>
              <input class="form-input" type="text" formControlName="fullName"
                     [placeholder]="'contact.placeholder.fullName' | translate" />
            </div>

            <div class="form-group">
              <label class="form-label">{{ 'contact.email' | translate }}</label>
              <input class="form-input" type="email" formControlName="email"
                     [placeholder]="'contact.placeholder.email' | translate" />
            </div>

            <div class="form-group">
              <label class="form-label">{{ 'contact.subject' | translate }}</label>
              <select class="form-input form-select" formControlName="subject">
                <option value="" disabled>{{ 'contact.placeholder.subject' | translate }}</option>
                <option value="General Inquiry">{{ 'contact.subjects.general' | translate }}</option>
                <option value="Report an Issue">{{ 'contact.subjects.report' | translate }}</option>
                <option value="Feature Request">{{ 'contact.subjects.feature' | translate }}</option>
                <option value="Partnership">{{ 'contact.subjects.partnership' | translate }}</option>
                <option value="Other">{{ 'contact.subjects.other' | translate }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">{{ 'contact.message' | translate }}</label>
              <textarea class="form-input form-textarea" formControlName="message" rows="5"
                        [placeholder]="'contact.placeholder.message' | translate"></textarea>
              <div class="char-count">{{ form.value.message?.length || 0 }} / 5000</div>
            </div>

            <button type="submit" class="btn btn-primary" [disabled]="!form.valid || submitting()">
              @if (submitting()) {
                <span class="spinner-sm"></span>
              }
              {{ submitting() ? ('contact.sending' | translate) : ('contact.send' | translate) }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .contact-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: var(--navy-900); padding: 16px;
      position: relative; overflow: hidden;
    }
    .contact-page::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse at 50% 80%, rgba(13,115,119,0.18) 0%, transparent 60%);
      pointer-events: none;
    }
    .contact-card {
      background: var(--surface-0); border-radius: var(--radius-xl); padding: 32px; width: 100%;
      max-width: 480px; box-shadow: var(--shadow-xl); position: relative; z-index: 1;
    }
    .back-btn {
      background: none; border: none; color: var(--text-tertiary); font-size: 14px; font-weight: 600;
      cursor: pointer; padding: 4px 0; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;
      font-family: var(--font-body); text-decoration: none; transition: color var(--transition-fast);
    }
    .back-btn:hover { color: var(--text-primary); }

    .contact-header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 40px; display: block; margin-bottom: 8px; }
    .contact-header h1 { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; font-family: var(--font-display); }
    .contact-header p { color: var(--text-tertiary); font-size: 14px; line-height: 1.5; }

    .error-alert {
      background: var(--danger-bg); color: var(--danger); border: 1px solid #fecaca;
      border-radius: var(--radius-sm); padding: 10px 14px; font-size: 13px; margin-bottom: 16px;
    }

    .success-card { text-align: center; padding: 16px 0; }
    .success-icon { font-size: 48px; display: block; margin-bottom: 12px; }
    .success-card h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; font-family: var(--font-display); }
    .success-card p { color: var(--text-tertiary); font-size: 14px; line-height: 1.6; margin-bottom: 24px; }

    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); font-size: 14px; }
    .form-input {
      width: 100%; padding: 12px; border: 2px solid var(--surface-border); border-radius: var(--radius-md);
      font-size: 15px; font-family: var(--font-body); box-sizing: border-box;
      background: var(--surface-0); color: var(--text-primary); transition: border-color var(--transition-fast);
    }
    .form-input:focus { outline: none; border-color: var(--accent-400); box-shadow: 0 0 0 3px rgba(13,115,119,0.1); }

    .form-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 32px;
    }
    :host-context([dir="rtl"]) .form-select {
      background-position: left 12px center;
      padding-right: 12px;
      padding-left: 32px;
    }

    .form-textarea { resize: vertical; min-height: 100px; max-height: 300px; }

    .char-count { text-align: end; font-size: 12px; color: var(--text-muted); margin-top: 4px; }

    .btn {
      width: 100%; padding: 14px; border: none; border-radius: var(--radius-lg);
      font-weight: 700; font-size: 16px; cursor: pointer; transition: all var(--transition-fast);
      display: flex; align-items: center; justify-content: center; gap: 8px;
      text-decoration: none; font-family: var(--font-body);
    }
    .btn-primary { background: var(--accent-600); color: white; }
    .btn-primary:hover:not(:disabled) { background: var(--accent-500); transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .spinner-sm {
      width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class ContactUsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);

  submitting = signal(false);
  sent = signal(false);
  error = signal('');

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    subject: ['', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.form.patchValue({ email: user.email });
    }
  }

  onSubmit(): void {
    if (!this.form.valid) return;

    this.submitting.set(true);
    this.error.set('');

    this.http.post(`${environment.apiBaseUrl}/contact`, this.form.value).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message || this.translate.instant('profile.errorGeneric'));
      },
    });
  }
}
