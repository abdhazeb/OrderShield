import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService, SupportedLanguage } from './core/services/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private languageService = inject(LanguageService);

  ngOnInit(): void {
    // LanguageService constructor already initializes language from localStorage
    // This is just a fallback if needed
    const savedLang = (localStorage.getItem('osp_language') || 'en') as SupportedLanguage;
    this.languageService.setLanguage(savedLang);
  }
}
