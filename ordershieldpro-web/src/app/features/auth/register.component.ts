import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PasswordInputComponent } from '../../shared/components/password-input/password-input.component';

/**
 * Backend (ASP.NET Identity) password policy:
 *  - min 10 chars, uppercase, lowercase, digit, non-alphanumeric (special).
 * Keep the frontend validators aligned so the request never gets a 400 for weak passwords.
 */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslateModule, PasswordInputComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private toast = inject(ToastService);

  submitting = signal(false);
  error = signal('');
  errorLines = computed(() => this.error().split('\n').filter(l => l.trim()));
  registrationComplete = signal(false);
  selectedVerificationMethod = signal<string>('email');

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    password: ['', [Validators.required, Validators.minLength(10), Validators.pattern(PASSWORD_PATTERN)]],
    confirmPassword: ['', [Validators.required]],
    organization: [''],
    agreeToTerms: [false, [Validators.requiredTrue]],
  }, { validators: [this.matchPasswords] });

  // Live password strength signals (used to render the rules checklist)
  private passwordValue = computed(() => this.form.controls.password.value || '');
  passwordRules = computed(() => {
    const v = this.passwordValue();
    return {
      length: v.length >= 10,
      upper: /[A-Z]/.test(v),
      lower: /[a-z]/.test(v),
      digit: /\d/.test(v),
      special: /[^A-Za-z0-9]/.test(v),
    };
  });
  passwordTouched = signal(false);
  passwordFocused = signal(false);

  matchPasswords(group: AbstractControl): ValidationErrors | null {
    const pw = group.get('password')?.value;
    const cpw = group.get('confirmPassword')?.value;
    return pw === cpw ? null : { passwordMismatch: true };
  }

  onPasswordFocus(): void { this.passwordFocused.set(true); }
  onPasswordBlur(): void { this.passwordTouched.set(true); this.passwordFocused.set(false); }

  goBack(): void {
    this.router.navigate(['/']);
  }

  continueAsGuest(): void {
    this.router.navigate(['/']);
  }

  confirmVerification(): void {
    // In production, this would trigger actual verification (email, SMS, or WhatsApp)
    this.toast.info(this.translate.instant('auth.verificationSent'));
    this.router.navigate(['/profile']);
  }

  skipVerification(): void {
    this.router.navigate(['/profile']);
  }

  onSubmit(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.passwordTouched.set(true);
      return;
    }

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
      phoneNumber: v.phoneNumber || undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.registrationComplete.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        let msg = this.translate.instant('auth.registrationFailed');
        if (err?.error?.errors && Array.isArray(err.error.errors)) {
          msg = err.error.errors.join('\n');
        } else if (err?.error?.errors && typeof err.error.errors === 'object') {
          // ASP.NET ValidationProblemDetails: { errors: { Field: [msg, ...] } }
          msg = Object.values(err.error.errors).flat().join('\n');
        } else if (err?.error?.title) {
          msg = err.error.title;
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
