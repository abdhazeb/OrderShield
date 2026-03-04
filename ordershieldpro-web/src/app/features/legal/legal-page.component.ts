import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
    <div class="legal-page">
      <div class="legal-card">
        <button class="back-btn" (click)="goBack()">← {{ 'common.back' | translate }}</button>

        <h1>{{ docType() === 'privacy' ? ('legal.privacyTitle' | translate) : ('legal.termsTitle' | translate) }}</h1>
        <p class="last-updated">{{ 'legal.lastUpdated' | translate }}: {{ 'legal.updateDate' | translate }}</p>

        <div class="legal-content" [innerHTML]="content()"></div>

        <div class="legal-nav">
          @if (docType() === 'privacy') {
            <a routerLink="/terms" class="nav-link">{{ 'legal.termsTitle' | translate }} →</a>
          } @else {
            <a routerLink="/privacy" class="nav-link">{{ 'legal.privacyTitle' | translate }} →</a>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      max-width: 800px; margin: 0 auto; padding: 24px 16px;
    }
    .legal-card {
      background: var(--surface-0); border-radius: var(--radius-xl); padding: 32px;
      border: 1px solid var(--surface-border); box-shadow: var(--shadow-xs);
    }
    .back-btn {
      background: none; border: none; color: var(--text-tertiary); font-size: 14px; font-weight: 600;
      cursor: pointer; padding: 4px 0; margin-bottom: 16px; font-family: var(--font-body);
      transition: color var(--transition-fast);
    }
    .back-btn:hover { color: var(--text-primary); }
    h1 { font-size: 24px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; font-family: var(--font-display); }
    .last-updated { font-size: 13px; color: var(--text-muted); margin-bottom: 24px; }
    .legal-content {
      font-size: 14px; line-height: 1.7; color: var(--text-primary);
    }
    .legal-content :first-child { margin-top: 0; }
    .legal-nav {
      margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--surface-border);
    }
    .nav-link {
      color: var(--accent-600); font-weight: 600; text-decoration: none; font-size: 14px;
      transition: color var(--transition-fast);
    }
    .nav-link:hover { text-decoration: underline; color: var(--accent-500); }

    @media (min-width: 768px) {
      .legal-card { padding: 48px; }
      h1 { font-size: 28px; }
    }
  `]
})
export class LegalPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private location = inject(Location);

  docType = signal<'privacy' | 'terms'>('privacy');
  content = signal('');

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.docType.set(data['type'] || 'privacy');
      this.loadContent();
    });
    this.translate.onLangChange.subscribe(() => this.loadContent());
  }

  private loadContent(): void {
    const key = this.docType() === 'privacy' ? 'legal.privacyContent' : 'legal.termsContent';
    this.content.set(this.translate.instant(key));
  }

  goBack(): void {
    this.location.back();
  }
}
