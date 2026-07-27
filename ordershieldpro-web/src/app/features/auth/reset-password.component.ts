import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { PasswordInputComponent } from '../../shared/components/password-input/password-input.component';

/**
 * Completes the password reset started from the forgot-password page. The email and
 * single-use token arrive as query parameters in the emailed link.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslateModule, PasswordInputComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);

  submitting = signal(false);
  succeeded = signal(false);
  error = signal('');
  linkValid = signal(true);

  private email = '';
  private token = '';

  form = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(10)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch }
  );

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.email = params.get('email') ?? '';
    this.token = params.get('token') ?? '';

    // A link missing either half can never succeed — say so before the user types.
    if (!this.email || !this.token) {
      this.linkValid.set(false);
    }
  }

  onSubmit(): void {
    if (!this.form.valid || !this.linkValid()) return;

    this.submitting.set(true);
    this.error.set('');

    this.api
      .post('auth/reset-password', {
        email: this.email,
        token: this.token,
        newPassword: this.form.value.newPassword,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.succeeded.set(true);
        },
        error: (err) => {
          this.submitting.set(false);
          const errors = err?.error?.errors;
          this.error.set(
            Array.isArray(errors) && errors.length
              ? errors.join(' ')
              : this.translate.instant('resetPassword.failed')
          );
        },
      });
  }
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}
