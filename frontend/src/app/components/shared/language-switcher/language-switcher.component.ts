import { Component, inject } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [],
  template: `
    <div class="relative group">
      <button
        class="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-xl flex items-center gap-2 transition-colors"
      >
        <i class="fa-solid fa-globe text-sky-500"></i>
        {{ getCurrentLanguageName() }}
      </button>

      <div
        class="absolute right-0 mt-2 w-40 max-h-64 overflow-y-auto bg-white border-2 border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 custom-scrollbar"
      >
        @for (lang of languages; track lang.code) {
          <button
            class="w-full text-left px-4 py-2 hover:bg-sky-50 text-slate-700 font-bold transition-colors"
            [class.text-sky-500]="translate.currentLang() === lang.code"
            [class.bg-sky-50]="translate.currentLang() === lang.code"
            (click)="switchLanguage(lang.code)"
          >
            {{ lang.name }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `,
  ],
})
export class LanguageSwitcherComponent {
  translate = inject(TranslateService);
  private languageService = inject(LanguageService);

  languages = [
    { code: 'en', name: 'English' },
    { code: 'id', name: 'Indonesia' },
    { code: 'ja', name: '日本語' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'ar', name: 'العربية' },
    { code: 'es', name: 'Español' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh-CN', name: '中文' },
    { code: 'ko', name: '한국어' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'pl', name: 'Polski' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'th', name: 'ไทย' },
    { code: 'sv', name: 'Svenska' },
    { code: 'el', name: 'Ελληνικά' },
    { code: 'bn', name: 'বাংলা' },
  ];

  switchLanguage(lang: string) {
    this.languageService.setLanguage(lang);
  }

  getCurrentLanguageName(): string {
    const currentCode = this.translate.currentLang();
    const lang = this.languages.find((l) => l.code === currentCode);
    if (lang) {
      // Just show the short version for the button (like EN, ID, or JA)
      return lang.code.toUpperCase();
    }
    return 'EN';
  }
}
