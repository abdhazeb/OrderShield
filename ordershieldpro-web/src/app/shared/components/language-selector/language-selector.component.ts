import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { LanguageService, SupportedLanguage } from '../../../core/services/language.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { Language } from '../../../core/enums';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  templateUrl: './language-selector.component.html',
  styleUrl: './language-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  }
})
export class LanguageSelectorComponent {
  languageService = inject(LanguageService);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  isOpen = signal(false);

  private readonly languageEnumMap: Record<SupportedLanguage, Language> = {
    en: Language.En,
    ar: Language.Ar,
    zh: Language.Zh,
  };

  getCurrentLabel(): string {
    const current = this.languageService.languageOptions.find(
      l => l.code === this.languageService.currentLanguage()
    );
    return current?.label || 'English';
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isOpen.update(v => !v);
  }

  onDocumentClick(event: Event): void {
    this.isOpen.set(false);
  }

  selectLanguage(code: SupportedLanguage, event: Event): void {
    event.stopPropagation();
    this.languageService.setLanguage(code);
    this.isOpen.set(false);

    // Persist the choice to the user's profile so it survives logout/login.
    if (this.authService.isAuthenticated()) {
      this.apiService.put('userprofile/language', { language: this.languageEnumMap[code] }).subscribe({
        error: () => {},
      });
    }
  }
}
