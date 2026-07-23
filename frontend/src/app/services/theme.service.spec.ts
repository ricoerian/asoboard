import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { ThemeService } from './theme.service';
import { UserPreference } from '../models/types';

describe('ThemeService', () => {
  let service: ThemeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThemeService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ThemeService);
    httpMock = TestBed.inject(HttpTestingController);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }),
    });
    service.init();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should have default theme as light', () => {
    expect(service.theme()).toBe('light');
  });

  it('should have default colorblind mode as none', () => {
    expect(service.colorblindMode()).toBe('none');
  });

  it('should have default reduced motion as false', () => {
    expect(service.reducedMotion()).toBe(false);
  });

  it('should set theme to high-contrast', () => {
    service.setTheme('high-contrast');
    expect(service.theme()).toBe('high-contrast');
    expect(document.body.classList.contains('theme-high-contrast')).toBe(true);

    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    expect(req.request.method).toBe('PATCH');
    req.flush({ theme: 'high-contrast', colorblind_mode: 'none', reduced_motion: false });
  });

  it('should set theme to light', () => {
    service.setTheme('high-contrast');
    httpMock.expectOne('http://localhost:8000/api/user-preferences/').flush({});
    service.setTheme('light');
    expect(service.theme()).toBe('light');
    expect(document.body.classList.contains('theme-high-contrast')).toBe(false);

    httpMock.expectOne('http://localhost:8000/api/user-preferences/').flush({});
  });

  it('should set colorblind mode', () => {
    service.setColorblindMode('protanopia');
    expect(service.colorblindMode()).toBe('protanopia');
    expect(document.body.classList.contains('cb-protanopia')).toBe(true);

    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('should clear colorblind class when set to none', () => {
    service.setColorblindMode('deuteranopia');
    httpMock.expectOne('http://localhost:8000/api/user-preferences/').flush({});
    service.setColorblindMode('none');
    expect(service.colorblindMode()).toBe('none');
    expect(document.body.classList.contains('cb-deuteranopia')).toBe(false);

    httpMock.expectOne('http://localhost:8000/api/user-preferences/').flush({});
  });

  it('should toggle reduced motion', () => {
    service.setReducedMotion(true);
    expect(service.reducedMotion()).toBe(true);
    expect(document.body.classList.contains('reduced-motion')).toBe(true);

    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    req.flush({});

    service.setReducedMotion(false);
    expect(service.reducedMotion()).toBe(false);
    expect(document.body.classList.contains('reduced-motion')).toBe(false);

    httpMock.expectOne('http://localhost:8000/api/user-preferences/').flush({});
  });

  it('should toggle all colorblind modes', () => {
    const modes: Array<'protanopia' | 'deuteranopia' | 'tritanopia'> = [
      'protanopia',
      'deuteranopia',
      'tritanopia',
    ];
    for (const mode of modes) {
      service.setColorblindMode(mode);
      httpMock.expectOne('http://localhost:8000/api/user-preferences/').flush({});
      expect(service.colorblindMode()).toBe(mode);
    }
    service.setColorblindMode('none');
    httpMock.expectOne('http://localhost:8000/api/user-preferences/').flush({});
    expect(document.body.classList.contains('cb-protanopia')).toBe(false);
    expect(document.body.classList.contains('cb-deuteranopia')).toBe(false);
    expect(document.body.classList.contains('cb-tritanopia')).toBe(false);
  });

  it('should be highContrast computed signal', () => {
    expect(service.isHighContrast()).toBe(false);
    service.setTheme('high-contrast');
    httpMock.expectOne('http://localhost:8000/api/user-preferences/').flush({});
    expect(service.isHighContrast()).toBe(true);
  });

  it('should be colorblindActive computed signal', () => {
    expect(service.isColorblindActive()).toBe(false);
    service.setColorblindMode('protanopia');
    httpMock.expectOne('http://localhost:8000/api/user-preferences/').flush({});
    expect(service.isColorblindActive()).toBe(true);
  });

  it('should load preferences from API', () => {
    const pref: UserPreference = {
      id: 1,
      theme: 'high-contrast',
      colorblind_mode: 'deuteranopia',
      reduced_motion: true,
      dyslexic_font: true,
      font_size: 'x-large',
    };
    service.loadFromApi();
    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    expect(req.request.method).toBe('GET');
    req.flush(pref);

    expect(service.theme()).toBe('high-contrast');
    expect(service.colorblindMode()).toBe('deuteranopia');
    expect(service.reducedMotion()).toBe(true);
    expect(service.dyslexicFont()).toBe(true);
    expect(service.fontSize()).toBe('x-large');
  });

  it('should handle API error gracefully', () => {
    service.loadFromApi();
    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    req.error(new ProgressEvent('error'));
    expect(service.theme()).toBe('light');
    expect(service.colorblindMode()).toBe('none');
    expect(service.reducedMotion()).toBe(false);
    expect(service.dyslexicFont()).toBe(false);
    expect(service.fontSize()).toBe('normal');
  });

  it('should default dyslexic font to false', () => {
    expect(service.dyslexicFont()).toBe(false);
  });

  it('should set dyslexic font to true', () => {
    service.setDyslexicFont(true);
    expect(service.dyslexicFont()).toBe(true);
    expect(document.body.classList.contains('font-dyslexic')).toBe(true);
    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    req.flush({});
  });

  it('should remove dyslexic font class when disabled', () => {
    service.setDyslexicFont(true);
    httpMock.expectOne('http://localhost:8000/api/user-preferences/').flush({});
    service.setDyslexicFont(false);
    expect(document.body.classList.contains('font-dyslexic')).toBe(false);
    httpMock.expectOne('http://localhost:8000/api/user-preferences/').flush({});
  });

  it('should default font size to normal', () => {
    expect(service.fontSize()).toBe('normal');
  });

  it('should set font size to large', () => {
    service.setFontSize('large');
    expect(service.fontSize()).toBe('large');
    expect(document.body.classList.contains('font-size-large')).toBe(true);
    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    req.flush({});
  });

  it('should set font size to x-large', () => {
    service.setFontSize('x-large');
    expect(service.fontSize()).toBe('x-large');
    expect(document.body.classList.contains('font-size-x-large')).toBe(true);
    expect(document.body.classList.contains('font-size-large')).toBe(false);
    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    req.flush({});
  });
});
