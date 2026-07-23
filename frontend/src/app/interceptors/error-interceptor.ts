import { HttpInterceptorFn, HttpErrorResponse, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const SKIP_ERROR_NOTIFICATION = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.context.get(SKIP_ERROR_NOTIFICATION)) {
        return throwError(() => error);
      }

      let errorMessage = 'An unexpected error occurred.';

      if (error.error instanceof ErrorEvent) {
        errorMessage = error.error.message;
      } else {
        if (error.status === 400) {
          if (typeof error.error === 'object') {
            const details = error.error;
            const firstKey = Object.keys(details)[0];
            const detail = details[firstKey];
            errorMessage = Array.isArray(detail)
              ? detail[0]
              : typeof detail === 'string'
                ? detail
                : 'Invalid data provided.';
          } else {
            errorMessage = error.error || 'Bad Request';
          }
        } else if (error.status === 401) {
          errorMessage = 'Please login to continue.';
        } else if (error.status === 403) {
          errorMessage = error.error?.detail || "You don't have permission to perform this action.";
        } else if (error.status === 404) {
          errorMessage = 'Resource not found.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      }

      notificationService.error(errorMessage);
      return throwError(() => error);
    }),
  );
};
