import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './legal-page.component.html',
  styleUrl: './legal-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
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
