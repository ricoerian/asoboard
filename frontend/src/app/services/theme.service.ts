import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { Api } from './api';
import { UserPreference, ThemeMode, ColorblindMode, FontSize } from '../models/types';

@Injectable({ providedIn: 'root' })
export class ThemeService implements OnDestroy {
  private api = inject(Api);

  readonly theme = signal<ThemeMode>('light');
  readonly colorblindMode = signal<ColorblindMode>('none');
  readonly reducedMotion = signal<boolean>(false);
  readonly dyslexicFont = signal<boolean>(false);
  readonly fontSize = signal<FontSize>('normal');

  readonly isHighContrast = computed(() => this.theme() === 'high-contrast');
  readonly isColorblindActive = computed(() => this.colorblindMode() !== 'none');

  private reducedMotionMedia?: MediaQueryList;
  private onReducedMotionChange?: (e: MediaQueryListEvent) => void;

  init(): void {
    this.reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.onReducedMotionChange = (e: MediaQueryListEvent) => {
      if (!this._loadedFromApi) {
        this.reducedMotion.set(e.matches);
        this._applyReducedMotion(e.matches);
      }
    };
    this.reducedMotionMedia.addEventListener('change', this.onReducedMotionChange);
    this._applyReducedMotion(this.reducedMotionMedia.matches);
  }

  private _loadedFromApi = false;

  loadFromApi(): void {
    this.api.getUserPreferences().subscribe({
      next: (pref) => {
        this._loadedFromApi = true;
        this.theme.set(pref.theme);
        this.colorblindMode.set(pref.colorblind_mode);
        this.reducedMotion.set(pref.reduced_motion);
        this.dyslexicFont.set(pref.dyslexic_font);
        this.fontSize.set(pref.font_size);
        this._applyAll();
      },
      error: () => {
        this._applyAll();
      },
    });
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    this._applyTheme();
    this._persist({ theme: mode });
  }

  setColorblindMode(mode: ColorblindMode): void {
    this.colorblindMode.set(mode);
    this._applyColorblind();
    this._persist({ colorblind_mode: mode });
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion.set(enabled);
    this._applyReducedMotion(enabled);
    this._persist({ reduced_motion: enabled });
  }

  setDyslexicFont(enabled: boolean): void {
    this.dyslexicFont.set(enabled);
    this._applyDyslexicFont();
    this._persist({ dyslexic_font: enabled });
  }

  setFontSize(size: FontSize): void {
    this.fontSize.set(size);
    this._applyFontSize();
    this._persist({ font_size: size });
  }

  private _applyAll(): void {
    this._applyTheme();
    this._applyColorblind();
    this._applyReducedMotion(this.reducedMotion());
    this._applyDyslexicFont();
    this._applyFontSize();
  }

  private _applyTheme(): void {
    const body = document.body;
    body.classList.remove('theme-high-contrast');
    if (this.theme() === 'high-contrast') {
      body.classList.add('theme-high-contrast');
    }
  }

  private _applyColorblind(): void {
    const body = document.body;
    body.classList.remove('cb-protanopia', 'cb-deuteranopia', 'cb-tritanopia');
    const mode = this.colorblindMode();
    if (mode !== 'none') {
      body.classList.add(`cb-${mode}`);
    }
  }

  private _applyReducedMotion(enabled: boolean): void {
    const body = document.body;
    if (enabled) {
      body.classList.add('reduced-motion');
    } else {
      body.classList.remove('reduced-motion');
    }
  }

  private _applyDyslexicFont(): void {
    const body = document.body;
    if (this.dyslexicFont()) {
      body.classList.add('font-dyslexic');
    } else {
      body.classList.remove('font-dyslexic');
    }
  }

  private _applyFontSize(): void {
    const body = document.body;
    body.classList.remove('font-size-large', 'font-size-x-large');
    const size = this.fontSize();
    if (size !== 'normal') {
      body.classList.add(`font-size-${size}`);
    }
  }

  private _persist(data: Partial<UserPreference>): void {
    this.api.updateUserPreferences(data).subscribe({
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    if (this.reducedMotionMedia && this.onReducedMotionChange) {
      this.reducedMotionMedia.removeEventListener('change', this.onReducedMotionChange);
    }
  }
}
