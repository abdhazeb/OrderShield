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

  const userRole = authService.getUserRole();
  if (userRole === null) {
    router.navigate(['/login']);
    return false;
  }

  const roleNames: Record<number, string> = { 0: 'Broker', 1: 'Buyer', 2: 'ServiceTeam', 3: 'Admin', 4: 'SuperAdmin' };
  const userRoleName = roleNames[userRole] ?? '';

  if (requiredRoles.includes(userRoleName)) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
