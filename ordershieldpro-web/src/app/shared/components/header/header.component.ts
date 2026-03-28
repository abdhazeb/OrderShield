import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslateModule, LanguageSelectorComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private confirmService = inject(ConfirmService);

  logout(): void {
    const message = this.translate.instant('nav.logoutConfirm');
    this.confirmService.confirm({ message, color: 'warn' }).subscribe(confirmed => {
      if (confirmed) {
        this.authService.logout();
        this.router.navigate(['/']);
      }
    });
  }
}
