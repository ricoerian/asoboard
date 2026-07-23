import { Component, inject } from '@angular/core';

import { ThemeService } from '../../../services/theme.service';
import { ColorblindMode, ThemeMode, FontSize } from '../../../models/types';

@Component({
  selector: 'app-accessibility-settings',
  standalone: true,
  imports: [],
  templateUrl: './accessibility-settings.html',
  styleUrl: './accessibility-settings.css',
})
export class AccessibilitySettings {
  private themeService = inject(ThemeService);

  readonly currentTheme = this.themeService.theme.asReadonly();
  readonly currentColorblind = this.themeService.colorblindMode.asReadonly();
  readonly currentReducedMotion = this.themeService.reducedMotion.asReadonly();
  readonly currentDyslexicFont = this.themeService.dyslexicFont.asReadonly();
  readonly currentFontSize = this.themeService.fontSize.asReadonly();

  readonly colorblindOptions: { value: ColorblindMode; label: string; desc: string }[] = [
    { value: 'none', label: 'Normal', desc: 'Default color vision' },
    { value: 'protanopia', label: 'Protanopia', desc: 'Red-blind (1% of males)' },
    { value: 'deuteranopia', label: 'Deuteranopia', desc: 'Green-blind (1% of males)' },
    { value: 'tritanopia', label: 'Tritanopia', desc: 'Blue-blind (rare)' },
  ];

  readonly fontSizeOptions: { value: FontSize; label: string; desc: string }[] = [
    { value: 'normal', label: 'Normal', desc: 'Default text size' },
    { value: 'large', label: 'Large', desc: '18px base, bigger headings' },
    { value: 'x-large', label: 'X-Large', desc: '22px base, maximum readability' },
  ];

  setTheme(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
  }

  setColorblind(mode: ColorblindMode): void {
    this.themeService.setColorblindMode(mode);
  }

  toggleReducedMotion(): void {
    this.themeService.setReducedMotion(!this.currentReducedMotion());
  }

  toggleDyslexicFont(): void {
    this.themeService.setDyslexicFont(!this.currentDyslexicFont());
  }

  setFontSize(size: FontSize): void {
    this.themeService.setFontSize(size);
  }
}
