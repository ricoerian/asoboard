import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have courseForm initialized with title and description', () => {
    expect(component.courseForm).toBeTruthy();
    expect(component.courseForm.get('title')).toBeTruthy();
    expect(component.courseForm.get('description')).toBeTruthy();
  });

  it('should start with empty search query', () => {
    expect(component.searchQuery).toBe('');
  });

  it('should start with default sort option "-created_at"', () => {
    expect(component.sortOption).toBe('-created_at');
  });

  it('should have currentUser as null initially', () => {
    expect(component.currentUser).toBeNull();
  });

  it('should start with empty courses array', () => {
    expect(component.courses).toEqual([]);
  });

  it('should start with empty filteredCourses array', () => {
    expect(component.filteredCourses).toEqual([]);
  });

  it('should update searchQuery on onSearchChange', () => {
    component.onSearchChange('math');
    expect(component.searchQuery).toBe('math');
  });

  it('should clear searchQuery on clearSearch', () => {
    component.onSearchChange('math');
    expect(component.searchQuery).toBe('math');
    component.clearSearch();
    expect(component.searchQuery).toBe('');
  });

  it('should update sortOption on onSortChange', () => {
    component.onSortChange('title');
    expect(component.sortOption).toBe('title');
  });

  it('should update sortOption to different value', () => {
    component.onSortChange('-session_count');
    expect(component.sortOption).toBe('-session_count');
  });

  it('should have no editing course initially', () => {
    expect(component.editingCourse).toBeNull();
  });

  it('should have no course to delete initially', () => {
    expect(component.courseToDeleteId).toBeNull();
  });

  it('should not show create modal initially', () => {
    expect(component.showCreateModal).toBe(false);
  });

  it('should not show edit modal initially', () => {
    expect(component.showEditModal).toBe(false);
  });

  it('should not show delete confirm initially', () => {
    expect(component.showDeleteConfirm).toBe(false);
  });

  it('should open create modal', () => {
    component.openCreateModal();
    expect(component.showCreateModal).toBe(true);
  });

  it('should close create modal', () => {
    component.openCreateModal();
    component.closeCreateModal();
    expect(component.showCreateModal).toBe(false);
  });

  it('should open delete confirm and set courseToDeleteId', () => {
    component.deleteCourse(42);
    expect(component.showDeleteConfirm).toBe(true);
    expect(component.courseToDeleteId).toBe(42);
  });

  it('should close delete confirm and clear courseToDeleteId', () => {
    component.deleteCourse(42);
    component.closeDeleteConfirm();
    expect(component.showDeleteConfirm).toBe(false);
    expect(component.courseToDeleteId).toBeNull();
  });

  it('should start with showMyCourses as false', () => {
    expect(component.showMyCourses).toBe(false);
  });

  it('should toggle showMyCourses with toggleMyCourses', () => {
    expect(component.showMyCourses).toBe(false);
    component.toggleMyCourses();
    expect(component.showMyCourses).toBe(true);
    component.toggleMyCourses();
    expect(component.showMyCourses).toBe(false);
  });

  it('should start with empty enrolledCourseIds', () => {
    expect(component.enrolledCourseIds.size).toBe(0);
  });

  it('should start with empty isEnrolling set', () => {
    expect(component.isEnrolling.size).toBe(0);
  });

  it('should return false for isEnrolled with unknown id', () => {
    expect(component.isEnrolled(999)).toBe(false);
  });

  it('should return true for isEnrolled after adding to set', () => {
    component.enrolledCourseIds.add(42);
    expect(component.isEnrolled(42)).toBe(true);
  });
});
