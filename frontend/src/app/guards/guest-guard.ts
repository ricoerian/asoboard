import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Api } from '../services/api';
import { catchError, map, of } from 'rxjs';

export const guestGuard: CanActivateFn = () => {
  const apiService = inject(Api);
  const router = inject(Router);

  return apiService.checkAuthStatus().pipe(
    map((user) => {
      if (user) {
        return router.createUrlTree(['/dashboard']);
      }
      return true;
    }),
    catchError(() => {
      return of(true);
    }),
  );
};
