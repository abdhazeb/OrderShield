import { Injectable, Injector, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TokenService } from './token.service';
import { LoginRequest, RegisterRequest, RefreshTokenRequest } from '../models/auth-request.model';
import { AuthResponse } from '../models/auth-response.model';
import { UserRole } from '../../enums';
import { LanguageService, SupportedLanguage } from '../../services/language.service';

export interface CurrentUser {
  userId: string;
  email: string;
  role: string;
  subscriptionTier: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _currentUser = signal<CurrentUser | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly isAdmin = computed(() => {
    const user = this._currentUser();
    return user?.role === 'Admin' || user?.role === 'ServiceTeam' || user?.role === 'SuperAdmin';
  });
  readonly isSuperAdmin = computed(() => {
    const user = this._currentUser();
    return user?.role === 'SuperAdmin';
  });

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private router: Router,
    private injector: Injector
  ) {
    this.loadUserFromToken();
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/register`, request).pipe(
      tap(response => {
        this.tokenService.setTokens(response.token, response.refreshToken, response.userId);
        this.loadUserFromToken();
      })
    );
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, request).pipe(
      tap(response => {
        this.tokenService.setTokens(response.token, response.refreshToken, response.userId);
        this.loadUserFromToken();
        // Apply the user's saved language preference (lazy inject to avoid circular DI)
        if (response.language) {
          const lang = response.language as SupportedLanguage;
          if (['en', 'ar', 'zh'].includes(lang)) {
            const languageService = this.injector.get(LanguageService);
            languageService.setLanguage(lang);
          }
        }
      })
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const userId = this.tokenService.getUserId();
    const refreshToken = this.tokenService.getRefreshToken();

    if (!userId || !refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    const request: RefreshTokenRequest = { userId, refreshToken };
    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/refresh-token`, request).pipe(
      tap(response => {
        this.tokenService.setTokens(response.token, response.refreshToken, response.userId);
        this.loadUserFromToken();
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    const token = this.tokenService.getAccessToken();
    if (token) {
      this.http.post(`${environment.apiBaseUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    }
    this.tokenService.clearTokens();
    this._currentUser.set(null);
    this.router.navigate(['/']);
  }

  getUserRole(): UserRole | null {
    const decoded = this.tokenService.getDecodedToken();
    if (!decoded) return null;
    const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role;
    const roleMap: Record<string, UserRole> = {
      'Broker': UserRole.Broker,
      'Buyer': UserRole.Buyer,
      'ServiceTeam': UserRole.ServiceTeam,
      'Admin': UserRole.Admin,
      'SuperAdmin': UserRole.SuperAdmin
    };
    return roleMap[role] ?? null;
  }

  private loadUserFromToken(): void {
    const decoded = this.tokenService.getDecodedToken();
    if (!decoded || !this.tokenService.isAuthenticated()) {
      this._currentUser.set(null);
      return;
    }

    this._currentUser.set({
      userId: decoded.sub || decoded.user_id,
      email: decoded.email,
      role: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role || '',
      subscriptionTier: decoded.subscription_tier || 'Free'
    });
  }
}
