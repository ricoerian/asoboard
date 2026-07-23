import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { SessionTimeoutService } from '../services/session-timeout.service';
import { SKIP_ERROR_NOTIFICATION } from './error-interceptor';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const sessionTimeoutService = inject(SessionTimeoutService);

  const clonedRequest = req.clone({
    withCredentials: true,
  });

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.context.get(SKIP_ERROR_NOTIFICATION)) {
        sessionTimeoutService.stopTracking();

        if (!router.url.includes('/login')) {
          router.navigate(['/login'], {
            queryParams: { sessionExpired: 'true' },
          });
        }
      }

      return throwError(() => error);
    }),
  );
};
