import { TranslatePipe } from '@ngx-translate/core';
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { User } from '../../models/types';
import { NotificationService } from '../../services/notification.service';
import { AccessibilitySettings } from '../shared/accessibility-settings/accessibility-settings';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AccessibilitySettings, TranslatePipe],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage implements OnInit {
  currentUser: User | null = null;
  isLoading = true;

  profileForm: FormGroup;
  passwordForm: FormGroup;

  showPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  isSavingProfile = false;
  isChangingPassword = false;

  selectedAvatarFile: File | null = null;
  avatarPreviewUrl: string | null = null;

  private apiService = inject(Api);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  constructor() {
    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      email: ['', [Validators.email, Validators.maxLength(254)]],
      bio: ['', [Validators.maxLength(500)]],
    });

    this.passwordForm = this.fb.group({
      current_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    this.apiService.checkAuthStatus().subscribe({
      next: (user: User) => {
        const parsedUser = typeof user === 'string' ? JSON.parse(user as string) : user;
        this.currentUser = parsedUser;
        this.profileForm.patchValue({
          username: parsedUser.username,
          email: parsedUser.email || '',
          bio: parsedUser.bio || '',
        });
        if (parsedUser.avatar) {
          this.avatarPreviewUrl = parsedUser.avatar;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.currentUser = null;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        this.notificationService.error('Avatar image must be smaller than 2MB.');
        return;
      }
      this.selectedAvatarFile = file;

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          this.avatarPreviewUrl = e.target.result as string;
          this.cdr.detectChanges();
        }
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile() {
    if (this.profileForm.invalid) return;

    this.isSavingProfile = true;
    const { username, email, bio } = this.profileForm.value;

    const data: { username?: string; email?: string; bio?: string; avatar?: File } = {
      username,
      email,
      bio,
    };
    if (this.selectedAvatarFile) {
      data.avatar = this.selectedAvatarFile;
    }

    this.apiService.updateProfile(data).subscribe({
      next: (user: User) => {
        this.currentUser = user;
        if (user.avatar) {
          this.avatarPreviewUrl = user.avatar;
        }
        this.isSavingProfile = false;
        this.selectedAvatarFile = null;
        this.notificationService.success('Profile updated successfully!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSavingProfile = false;
        const errors = err?.error;
        if (errors?.username) {
          this.notificationService.error(errors.username[0]);
        } else {
          this.notificationService.error('Failed to update profile.');
        }
        this.cdr.detectChanges();
      },
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) return;

    const { new_password, confirm_password } = this.passwordForm.value;
    if (new_password !== confirm_password) {
      this.notificationService.error('New passwords do not match!');
      return;
    }

    this.isChangingPassword = true;
    const { current_password, new_password: np } = this.passwordForm.value;

    this.apiService.changePassword({ current_password, new_password: np }).subscribe({
      next: () => {
        this.isChangingPassword = false;
        this.notificationService.success('Password changed successfully!');
        this.passwordForm.reset();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isChangingPassword = false;
        const errors = err?.error;
        if (errors?.current_password) {
          this.notificationService.error(errors.current_password[0]);
        } else if (errors?.new_password) {
          const msg = Array.isArray(errors.new_password)
            ? errors.new_password[0]
            : errors.new_password;
          this.notificationService.error(msg);
        } else {
          this.notificationService.error('Failed to change password.');
        }
        this.cdr.detectChanges();
      },
    });
  }

  togglePassword(field: 'current' | 'new' | 'confirm') {
    if (field === 'current') this.showPassword = !this.showPassword;
    if (field === 'new') this.showNewPassword = !this.showNewPassword;
    if (field === 'confirm') this.showConfirmPassword = !this.showConfirmPassword;
  }

  get roleColor(): string {
    if (!this.currentUser) return 'slate';
    const map: Record<string, string> = {
      mentor: 'pink',
      student: 'sky',
      staff: 'orange',
      parent: 'orange',
    };
    return map[this.currentUser.role] || 'slate';
  }

  get roleLabel(): string {
    if (!this.currentUser) return '';
    return this.currentUser.role.charAt(0).toUpperCase() + this.currentUser.role.slice(1);
  }

  get joinedDate(): string {
    if (!this.currentUser?.date_joined) return 'N/A';
    return new Date(this.currentUser.date_joined).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  get passwordsDoNotMatch(): boolean {
    const np = this.passwordForm.get('new_password')?.value;
    const cp = this.passwordForm.get('confirm_password')?.value;
    return cp.length > 0 && np !== cp;
  }
}
