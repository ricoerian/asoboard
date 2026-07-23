import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundComponent } from './not-found';
describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display 404 title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h1');
    expect(title?.textContent).toContain('Oops! Lost in Space');
  });

  it('should display 404 number', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';
    expect(text).toContain('404');
  });

  it('should have navigation links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('a[routerLink]');
    expect(links.length).toBeGreaterThan(0);
  });

  it('should have link to home', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const homeLink = compiled.querySelector('a[routerLink="/"]');
    expect(homeLink).toBeTruthy();
    expect(homeLink?.textContent).toContain('Go Home');
  });

  it('should have link to dashboard', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const dashboardLink = compiled.querySelector('a[routerLink="/dashboard"]');
    expect(dashboardLink).toBeTruthy();
    expect(dashboardLink?.textContent).toContain('My Dashboard');
  });

  it('should display helpful suggestions', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';
    expect(text).toContain('Home page to start learning');
    expect(text).toContain('Your dashboard to see courses');
    expect(text).toContain("Login if you haven't signed in");
  });

  it('should have compass icon', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const icon = compiled.querySelector('i.fa-compass');
    expect(icon).toBeTruthy();
  });

  it('should have child-friendly styling', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const mainDiv = compiled.querySelector('div');
    expect(mainDiv?.classList.contains('auth-bg')).toBe(true);
  });
});
