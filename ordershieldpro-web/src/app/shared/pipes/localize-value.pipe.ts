import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

/**
 * Turns a canonical English label into the camelCase suffix of its i18n key
 * ("Health & Medical" -> "healthMedical", "United Kingdom" -> "unitedKingdom").
 */
export function toI18nKeySuffix(label: string): string {
  return label
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word, i) => i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Displays a value that is *stored* canonically in English — a country, a product
 * category, a contact position — in the reader's language.
 *
 * These fields are persisted in English on purpose so the data stays comparable and a
 * report filed in Arabic still reads correctly for an English-speaking moderator. That
 * means every template showing one has to translate it, and forgetting to is why
 * "Health & Medical" and the country list kept surfacing untranslated. Use this pipe
 * anywhere such a value is rendered:
 *
 *   {{ review.productCategory | localizeValue:'productCategory' }}
 *   {{ entity.country | localizeValue:'country' }}
 *   {{ entity.productCategories | localizeValue:'productCategory' }}   <- comma-separated
 *
 * A value with no matching key falls through unchanged, so free text a user typed
 * (an "Other" position, a country not on the list) still displays as authored.
 *
 * Impure like ngx-translate's own pipe so it re-renders on a language switch; the result
 * is memoized per (value, namespace, language) so the repeated calls cost nothing.
 */
@Pipe({ name: 'localizeValue', standalone: true, pure: false })
export class LocalizeValuePipe implements PipeTransform, OnDestroy {
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  private lastValue?: string | null;
  private lastNamespace?: string;
  private lastLang?: string;
  private lastResult = '';

  private langSub: Subscription;

  constructor() {
    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.lastLang = undefined; // force a recompute on the next check
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.langSub.unsubscribe();
  }

  transform(value: string | null | undefined, namespace: string): string {
    if (!value) return '';

    const lang = this.translate.currentLang;
    if (value === this.lastValue && namespace === this.lastNamespace && lang === this.lastLang) {
      return this.lastResult;
    }

    // Several fields (TradeEntity.productCategories) hold a comma-separated list;
    // translate each part rather than failing to match the whole string.
    const separator = lang?.startsWith('ar') ? '، ' : ', ';
    const result = value
      .split(',')
      .map(part => this.translateOne(part.trim(), namespace))
      .filter(Boolean)
      .join(separator);

    this.lastValue = value;
    this.lastNamespace = namespace;
    this.lastLang = lang;
    this.lastResult = result;
    return result;
  }

  private translateOne(value: string, namespace: string): string {
    if (!value) return '';
    const key = `${namespace}.${toI18nKeySuffix(value)}`;
    const translated = this.translate.instant(key);
    // ngx-translate echoes the key back when there is no entry — that means this value
    // is free text, so show it as the user wrote it.
    return translated === key ? value : translated;
  }
}
