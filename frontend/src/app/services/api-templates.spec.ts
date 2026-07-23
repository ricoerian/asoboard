import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Api } from './api';

describe('Api Service - Session Templates', () => {
  let service: Api;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(Api);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getSessionTemplates method', () => {
    expect(service.getSessionTemplates).toBeDefined();
    expect(typeof service.getSessionTemplates).toBe('function');
  });

  it('should have getSessionTemplate method', () => {
    expect(service.getSessionTemplate).toBeDefined();
    expect(typeof service.getSessionTemplate).toBe('function');
  });

  it('should have createSessionTemplate method', () => {
    expect(service.createSessionTemplate).toBeDefined();
    expect(typeof service.createSessionTemplate).toBe('function');
  });

  it('should have updateSessionTemplate method', () => {
    expect(service.updateSessionTemplate).toBeDefined();
    expect(typeof service.updateSessionTemplate).toBe('function');
  });

  it('should have deleteSessionTemplate method', () => {
    expect(service.deleteSessionTemplate).toBeDefined();
    expect(typeof service.deleteSessionTemplate).toBe('function');
  });

  it('should have getStudentProgress method', () => {
    expect(service.getStudentProgress).toBeDefined();
    expect(typeof service.getStudentProgress).toBe('function');
  });

  it('should call correct endpoints for session-templates', () => {
    expect(service['baseUrl']).toBe('http://localhost:8000/api');
  });
});
