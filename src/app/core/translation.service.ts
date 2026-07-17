import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export type AppLanguage = 'de' | 'en';
type TranslationDictionary = Record<string, string>;

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly http = inject(HttpClient);
  readonly supportedLanguages: AppLanguage[] = ['de', 'en'];
  readonly language$ = new BehaviorSubject<AppLanguage>(this.initialLanguage());
  private dictionary: TranslationDictionary = {};

  constructor() {
    this.load(this.language$.value);
  }

  get currentLanguage(): AppLanguage {
    return this.language$.value;
  }

  setLanguage(language: AppLanguage): void {
    if (!this.supportedLanguages.includes(language)) return;
    localStorage.setItem('app-language', language);
    this.language$.next(language);
    this.load(language);
  }

  translate(key: string, params: Record<string, string | number> = {}): string {
    let value = this.dictionary[key] ?? key;
    Object.entries(params).forEach(([param, replacement]) => {
      value = value.replace(`{${param}}`, String(replacement));
    });
    return value;
  }

  private load(language: AppLanguage): void {
    this.http.get<TranslationDictionary>(`assets/i18n/${language}.json`).subscribe({
      next: (dictionary) => this.dictionary = dictionary,
    });
  }

  private initialLanguage(): AppLanguage {
    return localStorage.getItem('app-language') === 'en' ? 'en' : 'de';
  }
}
