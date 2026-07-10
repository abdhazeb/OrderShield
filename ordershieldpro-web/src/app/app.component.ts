import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService, SupportedLanguage } from './core/services/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private languageService = inject(LanguageService);

  ngOnInit(): void {
    // LanguageService constructor already initializes language from localStorage
    // This is just a fallback if needed
    const savedLang = (localStorage.getItem('osp_language') || 'ar') as SupportedLanguage;
    this.languageService.setLanguage(savedLang);
  }
}
