import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'osp_access_token';
const REFRESH_TOKEN_KEY = 'osp_refresh_token';
const USER_ID_KEY = 'osp_user_id';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private cachedDecoded: any | null = null;
  private cachedToken: string | null = null;

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getUserId(): string | null {
    return localStorage.getItem(USER_ID_KEY);
  }

  setTokens(accessToken: string, refreshToken: string, userId: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_ID_KEY, userId);
    this.cachedDecoded = null;
    this.cachedToken = null;
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    this.cachedDecoded = null;
    this.cachedToken = null;
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const payload = this.getDecodedToken();
      if (!payload) return false;
      const expiry = payload.exp * 1000;
      return Date.now() < expiry;
    } catch {
      return false;
    }
  }

  getDecodedToken(): any | null {
    const token = this.getAccessToken();
    if (!token) return null;

    if (token === this.cachedToken && this.cachedDecoded) {
      return this.cachedDecoded;
    }

    try {
      this.cachedToken = token;
      this.cachedDecoded = JSON.parse(atob(token.split('.')[1]));
      return this.cachedDecoded;
    } catch {
      this.cachedToken = null;
      this.cachedDecoded = null;
      return null;
    }
  }
}
