import { Directive, ElementRef, inject, OnInit, OnDestroy } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';
import { effect } from '@angular/core';

@Directive({
  selector: '[appRtl]',
  standalone: true,
})
export class RtlDirective implements OnInit {
  private el = inject(ElementRef);
  private languageService = inject(LanguageService);

  constructor() {
    effect(() => {
      const dir = this.languageService.currentLanguage() === 'ar' ? 'rtl' : 'ltr';
      this.el.nativeElement.setAttribute('dir', dir);
    });
  }

  ngOnInit(): void {
    const dir = this.languageService.currentLanguage() === 'ar' ? 'rtl' : 'ltr';
    this.el.nativeElement.setAttribute('dir', dir);
  }
}
