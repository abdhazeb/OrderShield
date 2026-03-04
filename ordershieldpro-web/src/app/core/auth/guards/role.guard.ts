import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data?.['roles'] as string[] | undefined;
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  const user = authService.currentUser();
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (requiredRoles.includes(user.role)) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
