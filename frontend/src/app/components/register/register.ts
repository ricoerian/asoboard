import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.html',
})
export class Register {
  private apiService = inject(Api);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  registerForm: FormGroup;

  constructor() {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(4)]],
      role: ['student', [Validators.required]],
    });
  }

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.apiService.register(this.registerForm.value).subscribe({
      next: () => {
        this.notificationService.success('Registration successful! Please login.');
        this.router.navigate(['/login']);
      },
    });
  }

  getRoleButtonClasses() {
    const role = this.registerForm.get('role')?.value;
    switch (role) {
      case 'student':
        return 'bg-teal-500 hover:bg-teal-400 shadow-teal-200';
      case 'mentor':
        return 'bg-pink-500 hover:bg-pink-400 shadow-pink-200';
      default:
        return 'bg-pink-500 hover:bg-pink-400 shadow-pink-200';
    }
  }

  getRoleTextColor() {
    const role = this.registerForm.get('role')?.value;
    switch (role) {
      case 'student':
        return 'text-teal-500';
      case 'mentor':
        return 'text-pink-500';
      default:
        return 'text-sky-500';
    }
  }
}
