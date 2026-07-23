import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Api } from '../services/api';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const apiService = inject(Api);
  const router = inject(Router);

  return apiService.checkAuthStatus().pipe(
    map((user) => {
      if (user) {
        return true;
      }
      return router.createUrlTree(['/login']);
    }),
    catchError(() => {
      return of(router.createUrlTree(['/login']));
    }),
  );
};
