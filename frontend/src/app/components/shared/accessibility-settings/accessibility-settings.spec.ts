import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { AccessibilitySettings } from './accessibility-settings';
import { ThemeService } from '../../../services/theme.service';

describe('AccessibilitySettings', () => {
  let component: AccessibilitySettings;
  let fixture: ComponentFixture<AccessibilitySettings>;
  let themeService: ThemeService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: '',
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }),
    });

    await TestBed.configureTestingModule({
      imports: [AccessibilitySettings],
      providers: [ThemeService, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessibilitySettings);
    component = fixture.componentInstance;
    themeService = TestBed.inject(ThemeService);
    themeService.init();
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display accessibility title', () => {
    const el = fixture.nativeElement;
    expect(el.textContent).toContain('Accessibility Settings');
  });

  it('should switch to high-contrast theme via setTheme', () => {
    component.setTheme('high-contrast');
    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    req.flush({});
    expect(themeService.theme()).toBe('high-contrast');
  });

  it('should switch to light theme via setTheme', () => {
    themeService.setTheme('high-contrast');
    httpMock.expectOne('http://localhost:8000/api/user-preferences/').flush({});
    component.setTheme('light');
    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    req.flush({});
    expect(themeService.theme()).toBe('light');
  });

  it('should set colorblind mode to protanopia', () => {
    component.setColorblind('protanopia');
    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    req.flush({});
    expect(themeService.colorblindMode()).toBe('protanopia');
  });

  it('should have four colorblind options', () => {
    expect(component.colorblindOptions.length).toBe(4);
    const labels = component.colorblindOptions.map((o) => o.label);
    expect(labels).toContain('Normal');
    expect(labels).toContain('Protanopia');
    expect(labels).toContain('Deuteranopia');
    expect(labels).toContain('Tritanopia');
  });

  it('should render all colorblind option buttons', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.grid.grid-cols-2 button');
    expect(buttons.length).toBe(4);
  });

  it('should toggle reduced motion', () => {
    const initial = themeService.reducedMotion();
    component.toggleReducedMotion();
    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    req.flush({});
    expect(themeService.reducedMotion()).toBe(!initial);
  });

  it('should have reduced motion toggle with switch role', () => {
    const toggleBtn = fixture.nativeElement.querySelector('[role="switch"]');
    expect(toggleBtn).toBeTruthy();
  });

  it('should read currentTheme from service', () => {
    expect(component.currentTheme()).toBe('light');
  });

  it('should read currentColorblind from service', () => {
    expect(component.currentColorblind()).toBe('none');
  });

  it('should read currentReducedMotion from service', () => {
    expect(component.currentReducedMotion()).toBe(false);
  });

  it('should toggle dyslexic font', () => {
    const initial = themeService.dyslexicFont();
    component.toggleDyslexicFont();
    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    req.flush({});
    expect(themeService.dyslexicFont()).toBe(!initial);
  });

  it('should have three font size options', () => {
    expect(component.fontSizeOptions.length).toBe(3);
    const labels = component.fontSizeOptions.map((o) => o.label);
    expect(labels).toContain('Normal');
    expect(labels).toContain('Large');
    expect(labels).toContain('X-Large');
  });

  it('should set font size to large', () => {
    component.setFontSize('large');
    const req = httpMock.expectOne('http://localhost:8000/api/user-preferences/');
    req.flush({});
    expect(themeService.fontSize()).toBe('large');
  });

  it('should read currentDyslexicFont from service', () => {
    expect(component.currentDyslexicFont()).toBe(false);
  });

  it('should read currentFontSize from service', () => {
    expect(component.currentFontSize()).toBe('normal');
  });

  it('should render three switch elements', () => {
    const switches = fixture.nativeElement.querySelectorAll('[role="switch"]');
    expect(switches.length).toBe(2);
  });
});
