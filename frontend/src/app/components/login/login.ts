import { TranslatePipe } from '@ngx-translate/core';
import { Component, OnInit, inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Api } from '../../services/api';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.html',
})
export class Login implements OnInit {
  private apiService = inject(Api);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['sessionExpired'] === 'true') {
        this.notificationService.warning('Your session has expired. Please log in again.');

        this.router.navigate([], {
          queryParams: { sessionExpired: null },
          queryParamsHandling: 'merge',
        });
      }
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.apiService.login(this.loginForm.value).subscribe({
      next: () => {
        this.notificationService.success('Welcome back!');
        this.router.navigate(['/dashboard']);
      },
    });
  }
}
