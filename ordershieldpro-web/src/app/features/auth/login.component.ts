import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <button class="back-btn" (click)="goBack()">← {{ 'common.back' | translate }}</button>

        <div class="auth-header">
          <span class="logo">🛡️</span>
          <h1>{{ 'auth.login' | translate }}</h1>
          <p>{{ 'auth.loginSubtitle' | translate }}</p>
        </div>

        @if (error()) {
          <div class="error-alert">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">{{ 'auth.email' | translate }}</label>
            <input class="form-input" type="email" formControlName="email" placeholder="your@email.com" />
          </div>

          <div class="form-group">
            <label class="form-label">{{ 'auth.password' | translate }}</label>
            <input class="form-input" type="password" formControlName="password" placeholder="••••••••" />
          </div>

          <div class="forgot-link">
            <a routerLink="/forgot-password">{{ 'auth.forgotPassword' | translate }}</a>
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="!form.valid || submitting()">
            @if (submitting()) {
              <span class="spinner-sm"></span>
            }
            {{ 'auth.loginButton' | translate }}
          </button>
        </form>

        <div class="auth-divider">
          <span>{{ 'auth.or' | translate }}</span>
        </div>

        <button class="btn btn-guest" (click)="continueAsGuest()">
          {{ 'auth.continueAsGuest' | translate }}
        </button>

        <div class="auth-footer">
          <span>{{ 'auth.noAccount' | translate }}</span>
          <a routerLink="/register">{{ 'auth.registerButton' | translate }}</a>
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
      max-width: 400px; box-shadow: var(--shadow-xl); position: relative;
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

    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); font-size: 14px; }
    .form-input {
      width: 100%; padding: 12px; border: 1.5px solid var(--surface-border); border-radius: var(--radius-md);
      font-size: 15px; font-family: var(--font-body); box-sizing: border-box;
      color: var(--text-primary);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }
    .form-input:focus { outline: none; border-color: var(--accent-400); box-shadow: 0 0 0 3px rgba(15, 145, 151, 0.1); }

    .forgot-link {
      text-align: right; margin-bottom: 16px; margin-top: -8px;
    }
    .forgot-link a {
      color: var(--accent-600); font-size: 13px; font-weight: 600; text-decoration: none;
    }
    .forgot-link a:hover { text-decoration: underline; }

    .btn {
      width: 100%; padding: 14px; border: none; border-radius: var(--radius-lg);
      font-weight: 700; font-size: 16px; cursor: pointer; transition: all var(--transition-base);
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-family: var(--font-body);
    }
    .btn-primary { background: var(--accent-600); color: white; box-shadow: 0 2px 8px rgba(13, 115, 119, 0.2); }
    .btn-primary:hover:not(:disabled) { background: var(--accent-500); box-shadow: var(--shadow-accent); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-guest {
      background: var(--surface-0); color: var(--accent-600); border: 1.5px solid var(--accent-400);
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
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  submitting = signal(false);
  error = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

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

    const { email, password } = this.form.value;
    this.authService.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.submitting.set(false);
        // Route admin/service team users to admin dashboard
        if (this.authService.isAdmin()) {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/profile']);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message || 'Invalid email or password');
      },
    });
  }
}
