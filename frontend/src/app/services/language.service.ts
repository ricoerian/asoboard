import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private translate = inject(TranslateService);
  private http = inject(HttpClient);

  private readonly STORAGE_KEY = 'asoboard_language';

  // Mapping of country codes to our supported languages
  private readonly COUNTRY_TO_LANG: Record<string, string> = {
    ID: 'id', // Indonesia
    JP: 'ja', // Japan
    DE: 'de', // Germany
    FR: 'fr', // France
    AE: 'ar', // UAE
    SA: 'ar', // Saudi Arabia
    EG: 'ar', // Egypt
    ES: 'es', // Spain
    MX: 'es', // Mexico
    AR: 'es', // Argentina
    IT: 'it', // Italy
    PT: 'pt', // Portugal
    BR: 'pt', // Brazil
    RU: 'ru', // Russia
    CN: 'zh-CN', // China
    TW: 'zh-CN', // Taiwan
    KR: 'ko', // South Korea
    IN: 'hi', // India
    TR: 'tr', // Turkey
    NL: 'nl', // Netherlands
    PL: 'pl', // Poland
    VN: 'vi', // Vietnam
    TH: 'th', // Thailand
    SE: 'sv', // Sweden
    GR: 'el', // Greece
    BD: 'bn', // Bangladesh
    US: 'en',
    GB: 'en',
    AU: 'en',
    CA: 'en',
  };

  init() {
    // 1. Check local storage
    const savedLang = localStorage.getItem(this.STORAGE_KEY);
    if (savedLang) {
      this.translate.use(savedLang);
      return;
    }

    // 2. Fallback: try to get from IP
    this.detectLanguageFromIP();
  }

  setLanguage(langCode: string) {
    localStorage.setItem(this.STORAGE_KEY, langCode);
    this.translate.use(langCode);
  }

  private detectLanguageFromIP() {
    // Free IP geolocation API (no key required, but rate limited to 45 req/min)
    // If it fails, fallback to browser language
    this.http.get<{ country_code?: string }>('https://ipapi.co/json/').subscribe({
      next: (response) => {
        if (response && response.country_code) {
          const countryCode = response.country_code;
          const mappedLang = this.COUNTRY_TO_LANG[countryCode];
          if (mappedLang) {
            this.translate.use(mappedLang);
            // Don't save to localStorage yet, let user explicitly change it if they want
            return;
          }
        }
        this.fallbackToBrowserLanguage();
      },
      error: () => {
        this.fallbackToBrowserLanguage();
      },
    });
  }

  private fallbackToBrowserLanguage() {
    const browserLang = this.translate.getBrowserLang();
    if (browserLang) {
      this.translate.use(browserLang);
    } else {
      this.translate.use('en');
    }
  }
}
