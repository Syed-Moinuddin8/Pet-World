import { User } from '../types.js';

let currentUser: User | null = null;

// Safe storage wrapper that gracefully handles iframe storage partitioning / sandbox restrictions
const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage access blocked in cross-origin / sandboxed iframe
    }
    return null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage access blocked in cross-origin / sandboxed iframe
    }
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage access blocked in cross-origin / sandboxed iframe
    }
  },
};

export function setActiveUser(user: User | null) {
  currentUser = user;
  if (user) {
    safeStorage.setItem('petworld_user', JSON.stringify(user));
  } else {
    safeStorage.removeItem('petworld_user');
  }
}

export const setAuthHeaders = setActiveUser;

export function getActiveUser(): User | null {
  if (currentUser) return currentUser;
  try {
    const saved = safeStorage.getItem('petworld_user');
    if (saved) {
      currentUser = JSON.parse(saved);
      return currentUser;
    }
  } catch (e) {
    console.warn('Failed to parse saved user', e);
  }
  return null;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const user = getActiveUser();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (user) {
    headers.set('x-user-id', user.id);
    headers.set('x-user-role', user.role);
    if (user.branchId) {
      headers.set('x-user-branch-id', user.branchId);
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.error) {
        errorMsg = errorJson.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
