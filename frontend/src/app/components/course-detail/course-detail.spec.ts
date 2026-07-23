import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CourseDetail } from './course-detail';

describe('CourseDetail', () => {
  let component: CourseDetail;
  let fixture: ComponentFixture<CourseDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseDetail],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(CourseDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have sessionForm initialized with title, mode, gameType', () => {
    expect(component.sessionForm).toBeTruthy();
    expect(component.sessionForm.get('title')).toBeTruthy();
    expect(component.sessionForm.get('mode')).toBeTruthy();
    expect(component.sessionForm.get('gameType')).toBeTruthy();
  });

  it('should start with course as null', () => {
    expect(component.course).toBeNull();
  });

  it('should start with currentUser as null', () => {
    expect(component.currentUser).toBeNull();
  });

  it('should become not loading after first stable', () => {
    expect(component.isLoading).toBe(false);
  });

  it('should have error set after failed course load', () => {
    expect(component.error).toBeTruthy();
  });

  it('should start with empty enrolledStudents array', () => {
    expect(component.enrolledStudents).toEqual([]);
  });

  it('should start with studentEnrollment as null', () => {
    expect(component.studentEnrollment).toBeNull();
  });

  it('should start with isEnrolling as false', () => {
    expect(component.isEnrolling).toBe(false);
  });

  it('should not show create session modal initially', () => {
    expect(component.showCreateSessionModal).toBe(false);
  });

  it('should not show delete course confirm initially', () => {
    expect(component.showDeleteCourseConfirm).toBe(false);
  });

  it('should not show delete session confirm initially', () => {
    expect(component.showDeleteSessionConfirm).toBe(false);
  });

  it('should have sessionToDeleteId as null initially', () => {
    expect(component.sessionToDeleteId).toBeNull();
  });

  it('should set isEnrolling to true when enrollStudent is called', () => {
    component.course = {
      id: 1,
      title: 'Test Course',
      mentor_id: 0,
    };
    component.enrollStudent();
    expect(component.isEnrolling).toBe(true);
  });
});
