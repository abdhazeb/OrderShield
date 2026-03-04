import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <button class="back-btn" (click)="goBack()">← {{ 'common.back' | translate }}</button>

        <div class="auth-header">
          <span class="logo">🛡️</span>
          <h1>{{ 'auth.register' | translate }}</h1>
          <p>{{ 'auth.registerSubtitle' | translate }}</p>
        </div>

        @if (error()) {
          <div class="error-alert">
            @for (line of errorLines(); track $index) {
              <div>{{ line }}</div>
            }
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">{{ 'auth.fullName' | translate }}</label>
            <input class="form-input" type="text" formControlName="fullName" [placeholder]="'auth.fullNameHint' | translate" />
          </div>

          <div class="form-group">
            <label class="form-label">{{ 'auth.email' | translate }}</label>
            <input class="form-input" type="email" formControlName="email" placeholder="your@email.com" />
          </div>

          <div class="form-group">
            <label class="form-label">{{ 'auth.password' | translate }}</label>
            <input class="form-input" type="password" formControlName="password" [placeholder]="'auth.passwordHint' | translate" />
          </div>

          <div class="form-group">
            <label class="form-label">{{ 'auth.confirmPassword' | translate }}</label>
            <input class="form-input" type="password" formControlName="confirmPassword" [placeholder]="'auth.confirmPasswordHint' | translate" />
            @if (form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched) {
              <span class="field-error">{{ 'auth.passwordMismatch' | translate }}</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label">{{ 'auth.organization' | translate }}</label>
            <input class="form-input" type="text" formControlName="organization" [placeholder]="'auth.organizationHint' | translate" />
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" formControlName="agreeToTerms" />
              <span>{{ 'legal.agreePrefix' | translate }}
                <a routerLink="/terms" target="_blank">{{ 'legal.termsTitle' | translate }}</a>
                {{ 'legal.and' | translate }}
                <a routerLink="/privacy" target="_blank">{{ 'legal.privacyTitle' | translate }}</a>
              </span>
            </label>
            @if (form.get('agreeToTerms')?.touched && form.get('agreeToTerms')?.hasError('required')) {
              <span class="field-error">{{ 'legal.mustAgree' | translate }}</span>
            }
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="!form.valid || submitting()">
            @if (submitting()) {
              <span class="spinner-sm"></span>
            }
            {{ 'auth.registerButton' | translate }}
          </button>
        </form>

        <div class="auth-divider">
          <span>{{ 'auth.or' | translate }}</span>
        </div>

        <button class="btn btn-guest" (click)="continueAsGuest()">
          {{ 'auth.continueAsGuest' | translate }}
        </button>

        <div class="auth-footer">
          <span>{{ 'auth.hasAccount' | translate }}</span>
          <a routerLink="/login">{{ 'auth.loginButton' | translate }}</a>
        </div>
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
      max-width: 440px; box-shadow: var(--shadow-xl); position: relative;
    }
    .back-btn {
      background: none; border: none; color: var(--text-tertiary); font-size: 14px; font-weight: 600;
      cursor: pointer; padding: 4px 0; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;
      font-family: var(--font-body);
    }
    .back-btn:hover { color: var(--text-primary); }

    .auth-header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 40px; display: block; margin-bottom: 8px; }
    .auth-header h1 { font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; letter-spacing: -0.02em; }
    .auth-header p { color: var(--text-tertiary); font-size: 14px; }

    .error-alert {
      background: var(--danger-bg); color: var(--danger); border: 1px solid #fecaca;
      border-radius: var(--radius-md); padding: 10px 14px; font-size: 13px; margin-bottom: 16px;
    }

    .form-group { margin-bottom: 14px; }
    .form-label { display: block; font-weight: 600; margin-bottom: 5px; color: var(--text-primary); font-size: 14px; }
    .form-input {
      width: 100%; padding: 11px; border: 1.5px solid var(--surface-border); border-radius: var(--radius-md);
      font-size: 15px; font-family: var(--font-body); box-sizing: border-box; background: var(--surface-0);
      color: var(--text-primary);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .form-input:focus { outline: none; border-color: var(--accent-400); box-shadow: 0 0 0 3px rgba(15, 145, 151, 0.1); }

    .field-error { display: block; color: var(--danger); font-size: 12px; margin-top: 4px; }

    .checkbox-group { margin-bottom: 16px; }
    .checkbox-label {
      display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--text-primary);
      cursor: pointer; line-height: 1.5;
    }
    .checkbox-label input[type="checkbox"] {
      margin-top: 3px; width: 16px; height: 16px; flex-shrink: 0; accent-color: var(--accent-600); cursor: pointer;
    }
    .checkbox-label a { color: var(--accent-600); text-decoration: none; font-weight: 600; }
    .checkbox-label a:hover { text-decoration: underline; }

    .btn {
      width: 100%; padding: 14px; border: none; border-radius: var(--radius-lg);
      font-weight: 700; font-size: 16px; cursor: pointer; transition: all var(--transition-base);
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-family: var(--font-body); margin-top: 8px;
    }
    .btn-primary { background: var(--accent-600); color: white; box-shadow: 0 2px 8px rgba(13, 115, 119, 0.2); }
    .btn-primary:hover:not(:disabled) { background: var(--accent-500); box-shadow: var(--shadow-accent); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-guest {
      background: var(--surface-0); color: var(--accent-600); border: 1.5px solid var(--accent-400); margin-top: 0;
    }
    .btn-guest:hover { background: var(--accent-50); }

    .auth-divider {
      text-align: center; margin: 16px 0; position: relative; color: var(--text-muted); font-size: 13px;
    }
    .auth-divider::before, .auth-divider::after {
      content: ''; position: absolute; top: 50%; width: 40%; height: 1px; background: var(--surface-border);
    }
    .auth-divider::before { left: 0; }
    .auth-divider::after { right: 0; }

    .spinner-sm {
      width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .auth-footer {
      text-align: center; margin-top: 20px; font-size: 14px; color: var(--text-tertiary);
    }
    .auth-footer a { color: var(--accent-600); font-weight: 600; text-decoration: none; margin-left: 4px; }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  submitting = signal(false);
  error = signal('');
  errorLines = computed(() => this.error().split('\\n').filter(l => l.trim()));

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    organization: [''],
    agreeToTerms: [false, [Validators.requiredTrue]],
  }, { validators: [this.matchPasswords] });

  matchPasswords(group: AbstractControl): ValidationErrors | null {
    const pw = group.get('password')?.value;
    const cpw = group.get('confirmPassword')?.value;
    return pw === cpw ? null : { passwordMismatch: true };
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  continueAsGuest(): void {
    this.router.navigate(['/']);
  }

  onSubmit(): void {
    if (!this.form.valid) return;

    this.submitting.set(true);
    this.error.set('');

    const v = this.form.value;
    this.authService.register({
      fullName: v.fullName!,
      email: v.email!,
      password: v.password!,
      role: 1,
      language: 0,
      organization: v.organization || undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        this.submitting.set(false);
        let msg = 'Registration failed';
        if (err?.error?.errors && Array.isArray(err.error.errors)) {
          msg = err.error.errors.join('\n');
        } else if (err?.error?.message) {
          msg = err.error.message;
        } else if (err?.error && typeof err.error === 'string') {
          msg = err.error;
        } else if (err?.message) {
          msg = err.message;
        }
        this.error.set(msg);
      },
    });
  }
}
