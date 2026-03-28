import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { LanguageService, SupportedLanguage } from '../../../core/services/language.service';

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
  isOpen = signal(false);

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
  }
}
