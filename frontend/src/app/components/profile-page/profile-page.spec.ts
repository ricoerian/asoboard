import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { ProfilePage } from './profile-page';
import { Api } from '../../services/api';
import { NotificationService } from '../../services/notification.service';
import { User } from '../../models/types';
import { of } from 'rxjs';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([]), provideHttpClient(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have profileForm initialized', () => {
    expect(component.profileForm).toBeTruthy();
    expect(component.profileForm.get('username')).toBeTruthy();
    expect(component.profileForm.get('email')).toBeTruthy();
  });

  it('should have passwordForm initialized', () => {
    expect(component.passwordForm).toBeTruthy();
    expect(component.passwordForm.get('current_password')).toBeTruthy();
    expect(component.passwordForm.get('new_password')).toBeTruthy();
    expect(component.passwordForm.get('confirm_password')).toBeTruthy();
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword).toBe(false);
    component.togglePassword('current');
    expect(component.showPassword).toBe(true);
    component.togglePassword('current');
    expect(component.showPassword).toBe(false);
  });

  it('should toggle new password visibility', () => {
    expect(component.showNewPassword).toBe(false);
    component.togglePassword('new');
    expect(component.showNewPassword).toBe(true);
  });

  it('should toggle confirm password visibility', () => {
    expect(component.showConfirmPassword).toBe(false);
    component.togglePassword('confirm');
    expect(component.showConfirmPassword).toBe(true);
  });

  it('should detect password mismatch', () => {
    component.passwordForm.patchValue({
      new_password: 'password123',
      confirm_password: 'different',
    });
    expect(component.passwordsDoNotMatch).toBe(true);
  });

  it('should not detect mismatch when passwords match', () => {
    component.passwordForm.patchValue({
      new_password: 'password123',
      confirm_password: 'password123',
    });
    expect(component.passwordsDoNotMatch).toBe(false);
  });

  it('should not detect mismatch when confirm is empty', () => {
    component.passwordForm.patchValue({
      new_password: 'password123',
      confirm_password: '',
    });
    expect(component.passwordsDoNotMatch).toBe(false);
  });

  it('should return N/A for joinedDate when no date_joined', () => {
    component.currentUser = { id: 1, username: 'test', email: '', role: 'student' };
    expect(component.joinedDate).toBe('N/A');
  });

  it('should return correct roleLabel', () => {
    component.currentUser = { id: 1, username: 'test', email: '', role: 'mentor' };
    expect(component.roleLabel).toBe('Mentor');
  });

  it('should return correct roleColor for Student', () => {
    component.currentUser = { id: 1, username: 'test', email: '', role: 'student' };
    expect(component.roleColor).toBe('sky');
  });

  it('should return empty roleLabel when no user', () => {
    component.currentUser = null;
    expect(component.roleLabel).toBe('');
  });
});

describe('ProfilePage — Agent Shiro Extensions', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  const testUser: User = {
    id: 7,
    username: 'agent_shiro',
    email: 'shiro@test.com',
    role: 'mentor',
    date_joined: '2026-01-15T08:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([]), provideHttpClient(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    component.currentUser = testUser;
    component.isLoading = false;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  describe('Profile Form Validation', () => {
    it('should reject username that is too short', () => {
      component.profileForm.get('username')?.setValue('ab');
      expect(component.profileForm.valid).toBe(false);
    });

    it('should reject empty username', () => {
      component.profileForm.get('username')?.setValue('');
      expect(component.profileForm.valid).toBe(false);
    });

    it('should accept valid form', () => {
      component.profileForm.patchValue({ username: 'validname', email: 'ok@test.com' });
      expect(component.profileForm.valid).toBe(true);
    });

    it('should reject invalid email', () => {
      component.profileForm.patchValue({ username: 'validname', email: 'nope' });
      expect(component.profileForm.valid).toBe(false);
    });

    it('should allow empty email', () => {
      component.profileForm.patchValue({ username: 'validname', email: '' });
      expect(component.profileForm.valid).toBe(true);
    });

    it('should save profile when form is valid', () => {
      let saveCalled = false;
      const api = TestBed.inject(Api);
      api.updateProfile = () => {
        saveCalled = true;
        return of({ ...testUser, username: 'saved' });
      };
      const notif = TestBed.inject(NotificationService);
      notif.success = () => {};

      component.profileForm.patchValue({ username: 'new_name', email: 'n@test.com' });
      component.saveProfile();
      expect(saveCalled).toBe(true);
    });

    it('should not call API when profile form is invalid', () => {
      let saveCalled = false;
      const api = TestBed.inject(Api);
      api.updateProfile = () => {
        saveCalled = true;
        return of(testUser);
      };

      component.profileForm.get('username')?.setValue('');
      component.saveProfile();
      expect(saveCalled).toBe(false);
    });

    it('should update currentUser on successful profile save', () => {
      const api = TestBed.inject(Api);
      api.updateProfile = () => of({ ...testUser, username: 'new_name' });
      const notif = TestBed.inject(NotificationService);
      notif.success = () => {};

      component.profileForm.patchValue({ username: 'new_name', email: 'n@test.com' });
      component.saveProfile();
      expect(component.currentUser?.username).toBe('new_name');
    });
  });

  describe('Change Password', () => {
    it('should change password when form valid and match', () => {
      let cpCalled = false;
      const api = TestBed.inject(Api);
      api.changePassword = () => {
        cpCalled = true;
        return of({ message: 'Password changed successfully.' });
      };
      const notif = TestBed.inject(NotificationService);
      notif.success = () => {};

      component.passwordForm.patchValue({
        current_password: 'OldPass123',
        new_password: 'NewPass456',
        confirm_password: 'NewPass456',
      });
      component.changePassword();
      expect(cpCalled).toBe(true);
    });

    it('should not call API when passwords do not match', () => {
      let cpCalled = false;
      const api = TestBed.inject(Api);
      api.changePassword = () => {
        cpCalled = true;
        return of({ message: 'ok' });
      };
      const notif = TestBed.inject(NotificationService);
      notif.error = () => {};

      component.passwordForm.patchValue({
        current_password: 'OldPass123',
        new_password: 'NewPass456',
        confirm_password: 'different',
      });
      component.changePassword();
      expect(cpCalled).toBe(false);
    });

    it('should show error notification on password mismatch', () => {
      let errorMsg = '';
      const notif = TestBed.inject(NotificationService);
      notif.error = (msg: string) => {
        errorMsg = msg;
      };

      component.passwordForm.patchValue({
        current_password: 'OldPass123',
        new_password: 'NewPass456',
        confirm_password: 'different',
      });
      component.changePassword();
      expect(errorMsg).toBe('New passwords do not match!');
    });

    it('should reset password form after successful change', () => {
      const api = TestBed.inject(Api);
      api.changePassword = () => of({ message: 'Password changed successfully.' });
      const notif = TestBed.inject(NotificationService);
      notif.success = () => {};

      component.passwordForm.patchValue({
        current_password: 'OldPass123',
        new_password: 'NewPass456',
        confirm_password: 'NewPass456',
      });
      component.passwordForm.markAsDirty();
      component.changePassword();
      expect(component.passwordForm.pristine).toBe(true);
    });

    it('should not call API when form invalid (empty fields)', () => {
      let cpCalled = false;
      const api = TestBed.inject(Api);
      api.changePassword = () => {
        cpCalled = true;
        return of({ message: 'ok' });
      };

      component.passwordForm.patchValue({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      component.changePassword();
      expect(cpCalled).toBe(false);
    });
  });

  describe('Toggle Password Isolation', () => {
    it('should not cross-affect other fields', () => {
      component.togglePassword('current');
      expect(component.showPassword).toBe(true);
      expect(component.showNewPassword).toBe(false);
      expect(component.showConfirmPassword).toBe(false);
    });
  });

  describe('Getters — Role Coverage', () => {
    it('should return pink for mentor', () => {
      component.currentUser = { ...testUser, role: 'mentor' };
      expect(component.roleColor).toBe('pink');
    });

    it('should return sky for student', () => {
      component.currentUser = { ...testUser, role: 'student' };
      expect(component.roleColor).toBe('sky');
    });

    it('should return orange for staff', () => {
      component.currentUser = { ...testUser, role: 'staff' };
      expect(component.roleColor).toBe('orange');
    });

    it('should return orange for parent', () => {
      component.currentUser = { ...testUser, role: 'parent' };
      expect(component.roleColor).toBe('orange');
    });

    it('should return slate when no user', () => {
      component.currentUser = null;
      expect(component.roleColor).toBe('slate');
    });

    it('should return slate for unknown role', () => {
      component.currentUser = { ...testUser, role: 'unknown' as User['role'] };
      expect(component.roleColor).toBe('slate');
    });

    it('should capitalize roleLabel', () => {
      component.currentUser = { ...testUser, role: 'student' };
      expect(component.roleLabel).toBe('Student');
    });

    it('should format joinedDate when date_joined exists', () => {
      component.currentUser = {
        id: 7,
        username: 'agent_shiro',
        email: 'shiro@test.com',
        role: 'mentor',
        date_joined: '2026-01-15T08:00:00Z',
      };
      const formatted = component.joinedDate;
      expect(formatted).toContain('2026');
      expect(formatted).not.toBe('N/A');
    });

    it('should return N/A when currentUser is null', () => {
      component.currentUser = null;
      expect(component.joinedDate).toBe('N/A');
    });
  });
});
