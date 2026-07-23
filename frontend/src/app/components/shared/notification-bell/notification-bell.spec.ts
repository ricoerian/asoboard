/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationBell } from './notification-bell';
import { Api } from '../../../services/api';
import { of, EMPTY } from 'rxjs';
import { AppNotification } from '../../../models/types';
import { vi } from 'vitest';

describe('NotificationBell', () => {
  let component: NotificationBell;
  let fixture: ComponentFixture<NotificationBell>;
  let apiSpy: { [K in keyof Api]: ReturnType<typeof vi.fn> };

  const mockNotifications: AppNotification[] = [
    {
      id: 1,
      title: 'Achievement earned!',
      message: 'You earned First Steps',
      notification_type: 'achievement',
      related_object_id: null,
      related_object_type: null,
      is_read: false,
      created_at: new Date().toISOString(),
      recipient: 1,
      recipient_username: 'student1',
    },
    {
      id: 2,
      title: 'New course enrolled!',
      message: 'You enrolled in Math',
      notification_type: 'enrollment',
      related_object_id: 1,
      related_object_type: 'course',
      is_read: true,
      created_at: new Date(Date.now() - 60000).toISOString(),
      recipient: 1,
      recipient_username: 'student1',
    },
  ];

  beforeEach(async () => {
    apiSpy = {
      getUnreadNotificationCount: vi.fn().mockReturnValue(EMPTY),
      getNotifications: vi.fn().mockReturnValue(EMPTY),
      markNotificationRead: vi.fn().mockReturnValue(EMPTY),
      markAllNotificationsRead: vi.fn().mockReturnValue(EMPTY),
      deleteNotification: vi.fn().mockReturnValue(EMPTY),
    } as any;

    await TestBed.configureTestingModule({
      imports: [NotificationBell],
      providers: [{ provide: Api, useValue: apiSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBell);
    component = fixture.componentInstance;
    component.showDropdown = true;
    component.notifications = mockNotifications;
    component.isLoading = false;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load unread count on init', () => {
    expect(apiSpy.getUnreadNotificationCount).toHaveBeenCalled();
  });

  it('should display bell icon', () => {
    const bell = fixture.nativeElement.querySelector('.fa-bell');
    expect(bell).toBeTruthy();
  });

  it('should show unread count badge when count > 0', () => {
    (apiSpy.getUnreadNotificationCount as any).mockReturnValue(of({ unread_count: 3 }));
    (apiSpy.getNotifications as any).mockReturnValue(of([]));
    const newFixture = TestBed.createComponent(NotificationBell);
    newFixture.detectChanges();
    const badge = newFixture.nativeElement.querySelector('.min-w-\\[18px\\]');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('3');
  });

  it('should not show badge when unread count is 0', () => {
    (apiSpy.getUnreadNotificationCount as any).mockReturnValue(of({ unread_count: 0 }));
    (apiSpy.getNotifications as any).mockReturnValue(of([]));
    const newFixture = TestBed.createComponent(NotificationBell);
    newFixture.detectChanges();
    const badge = newFixture.nativeElement.querySelector('.animate-pulse');
    expect(badge).toBeNull();
  });

  it('should toggle dropdown on bell click', () => {
    component.showDropdown = false;
    expect(component.showDropdown).toBe(false);
    component.toggleDropdown();
    expect(component.showDropdown).toBe(true);
    component.toggleDropdown();
    expect(component.showDropdown).toBe(false);
  });

  it('should load notifications when dropdown opens', () => {
    component.toggleDropdown();
    expect(apiSpy.getNotifications).toHaveBeenCalled();
  });

  it('should display notifications in dropdown', () => {
    expect(component.showDropdown).toBe(true);
    expect(component.notifications.length).toBe(2);
    expect(component.notifications[0].title).toBe('Achievement earned!');
    expect(component.notifications[1].title).toBe('New course enrolled!');
  });

  it('should display empty state when no notifications', () => {
    (apiSpy.getNotifications as any).mockReturnValue(of([]));
    const newFixture = TestBed.createComponent(NotificationBell);
    newFixture.componentInstance.showDropdown = true;
    newFixture.componentInstance.notifications = [];
    newFixture.componentInstance.isLoading = false;
    newFixture.detectChanges();
    const empty = newFixture.nativeElement.querySelector('.fa-bell-slash');
    expect(empty).toBeTruthy();
  });

  it('should call markNotificationRead on click', () => {
    component.markAsRead(mockNotifications[0]);
    expect(apiSpy.markNotificationRead).toHaveBeenCalledWith(1);
  });

  it('should not mark read if already read', () => {
    component.markAsRead(mockNotifications[1]);
    expect(apiSpy.markNotificationRead).not.toHaveBeenCalled();
  });

  it('should mark all as read', () => {
    component.markAllRead(new Event('click'));
    fixture.detectChanges();
    expect(apiSpy.markAllNotificationsRead).toHaveBeenCalled();
  });

  it('should delete a notification', () => {
    component.deleteNotification(mockNotifications[0], new Event('click'));
    fixture.detectChanges();
    expect(apiSpy.deleteNotification).toHaveBeenCalledWith(1);
  });

  it('should format timeAgo correctly', () => {
    expect(component.timeAgo(new Date().toISOString())).toBe('Just now');
    const oneMinAgo = new Date(Date.now() - 60000).toISOString();
    expect(component.timeAgo(oneMinAgo)).toBe('1m ago');
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    expect(component.timeAgo(oneHourAgo)).toBe('1h ago');
  });

  it('should return correct type icon', () => {
    expect(component.typeIcon('achievement')).toBe('fa-star');
    expect(component.typeIcon('enrollment')).toBe('fa-user-plus');
    expect(component.typeIcon('diary_comment')).toBe('fa-comment-dots');
    expect(component.typeIcon('system')).toBe('fa-circle-info');
    expect(component.typeIcon('unknown')).toBe('fa-bell');
  });

  it('should return correct type color', () => {
    expect(component.typeColor('achievement')).toContain('amber');
    expect(component.typeColor('enrollment')).toContain('green');
  });

  it('should display 99+ for unread count over 99', () => {
    (apiSpy.getUnreadNotificationCount as any).mockReturnValue(of({ unread_count: 150 }));
    (apiSpy.getNotifications as any).mockReturnValue(of([]));
    const newFixture = TestBed.createComponent(NotificationBell);
    newFixture.detectChanges();
    const badge = newFixture.nativeElement.querySelector('.min-w-\\[18px\\]');
    expect(badge.textContent.trim()).toBe('99+');
  });
});
