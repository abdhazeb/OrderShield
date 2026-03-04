import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type SupportedLanguage = 'en' | 'ar' | 'zh';

const LANGUAGE_KEY = 'osp_language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private _currentLanguage = signal<SupportedLanguage>('en');
  readonly currentLanguage = this._currentLanguage.asReadonly();

  readonly languageOptions: { code: SupportedLanguage; label: string; shortLabel: string; dir: 'ltr' | 'rtl' }[] = [
    { code: 'en', label: 'English', shortLabel: 'EN', dir: 'ltr' },
    { code: 'ar', label: 'العربية', shortLabel: 'ع', dir: 'rtl' },
    { code: 'zh', label: '中文', shortLabel: '中', dir: 'ltr' }
  ];

  constructor(private translate: TranslateService) {
    this.translate.addLangs(['en', 'ar', 'zh']);
    this.translate.setDefaultLang('en');

    const savedLang = localStorage.getItem(LANGUAGE_KEY) as SupportedLanguage;
    const lang = savedLang || 'en';
    this.setLanguage(lang);
  }

  setLanguage(lang: SupportedLanguage): void {
    this._currentLanguage.set(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);

    // Load translations first, then apply direction change
    this.translate.use(lang).subscribe({
      next: () => {
        const dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', lang);
      },
      error: () => {
        // Even on error, apply direction so the UI is consistent
        const dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', lang);
      }
    });
  }

  getDirection(): 'ltr' | 'rtl' {
    return this._currentLanguage() === 'ar' ? 'rtl' : 'ltr';
  }
}
