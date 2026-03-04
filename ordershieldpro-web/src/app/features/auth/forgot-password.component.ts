import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <button class="back-btn" routerLink="/login">← {{ 'forgotPassword.backToLogin' | translate }}</button>

        <div class="auth-header">
          <span class="logo">🔑</span>
          <h1>{{ 'forgotPassword.title' | translate }}</h1>
          <p>{{ 'forgotPassword.subtitle' | translate }}</p>
        </div>

        @if (emailSent()) {
          <div class="success-card">
            <span class="success-icon">✅</span>
            <h2>{{ 'forgotPassword.emailSent' | translate }}</h2>
            <p>{{ 'forgotPassword.emailSentDesc' | translate }}</p>
            <a routerLink="/login" class="btn btn-primary">{{ 'forgotPassword.backToLogin' | translate }}</a>
          </div>
        } @else {
          @if (error()) {
            <div class="error-alert">{{ error() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label class="form-label">{{ 'auth.email' | translate }}</label>
              <input class="form-input" type="email" formControlName="email" placeholder="your@email.com" />
            </div>

            <button type="submit" class="btn btn-primary" [disabled]="!form.valid || submitting()">
              @if (submitting()) {
                <span class="spinner-sm"></span>
              }
              {{ submitting() ? ('forgotPassword.sending' | translate) : ('forgotPassword.sendResetLink' | translate) }}
            </button>
          </form>

          <div class="auth-footer">
            <a routerLink="/login">{{ 'forgotPassword.backToLogin' | translate }}</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: var(--navy-900); padding: 16px;
      background-image: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(15, 145, 151, 0.12) 0%, transparent 60%);
    }
    .auth-card {
      background: var(--surface-0); border-radius: var(--radius-xl); padding: 32px; width: 100%;
      max-width: 420px; box-shadow: var(--shadow-xl); position: relative;
    }
    .back-btn {
      background: none; border: none; color: var(--text-tertiary); font-size: 14px; font-weight: 600;
      cursor: pointer; padding: 4px 0; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;
      font-family: var(--font-body); text-decoration: none;
    }
    .back-btn:hover { color: var(--text-primary); }

    .auth-header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 40px; display: block; margin-bottom: 8px; }
    .auth-header h1 { font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; letter-spacing: -0.02em; }
    .auth-header p { color: var(--text-tertiary); font-size: 14px; line-height: 1.5; }

    .error-alert {
      background: var(--danger-bg); color: var(--danger); border: 1px solid #fecaca;
      border-radius: var(--radius-md); padding: 10px 14px; font-size: 13px; margin-bottom: 16px;
    }

    .success-card {
      text-align: center; padding: 16px 0;
    }
    .success-icon { font-size: 48px; display: block; margin-bottom: 12px; }
    .success-card h2 { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
    .success-card p { color: var(--text-tertiary); font-size: 14px; line-height: 1.6; margin-bottom: 24px; }

    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); font-size: 14px; }
    .form-input {
      width: 100%; padding: 12px; border: 1.5px solid var(--surface-border); border-radius: var(--radius-md);
      font-size: 15px; font-family: var(--font-body); box-sizing: border-box;
      color: var(--text-primary);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .form-input:focus { outline: none; border-color: var(--accent-400); box-shadow: 0 0 0 3px rgba(15, 145, 151, 0.1); }

    .btn {
      width: 100%; padding: 14px; border: none; border-radius: var(--radius-lg);
      font-weight: 700; font-size: 16px; cursor: pointer; transition: all var(--transition-base);
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-family: var(--font-body); text-decoration: none;
    }
    .btn-primary { background: var(--accent-600); color: white; box-shadow: 0 2px 8px rgba(13, 115, 119, 0.2); }
    .btn-primary:hover:not(:disabled) { background: var(--accent-500); box-shadow: var(--shadow-accent); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .spinner-sm {
      width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .auth-footer {
      text-align: center; margin-top: 20px; font-size: 14px;
    }
    .auth-footer a { color: var(--accent-600); font-weight: 600; text-decoration: none; }
    .auth-footer a:hover { text-decoration: underline; }
  `]
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  submitting = signal(false);
  emailSent = signal(false);
  error = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    if (!this.form.valid) return;

    this.submitting.set(true);
    this.error.set('');

    const email = this.form.value.email!;
    this.http.post(`${environment.apiBaseUrl}/auth/forgot-password`, { email }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.emailSent.set(true);
      },
      error: () => {
        // Always show success for security — don't reveal if email exists
        this.submitting.set(false);
        this.emailSent.set(true);
      },
    });
  }
}
