import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_USER_NAME,
  DEFAULT_USER_EMAIL,
  MOCK_PASSWORD,
  STORAGE_KEYS,
} from '@/data/constants';

/**
 * Mock user object for Sprint 1.
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;

  /** Attempt mock login. Returns error message on failure, null on success. */
  login: (email: string, password: string) => string | null;

  /** Clear auth state. */
  logout: () => void;
}

/**
 * Auth store with localStorage persistence via Zustand persist middleware.
 *
 * Mock credentials:
 *   email: kyune@example.com
 *   password: pocketflow123
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (email: string, password: string): string | null => {
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail) {
          return 'Email tidak boleh kosong.';
        }
        if (!password) {
          return 'Password tidak boleh kosong.';
        }
        if (trimmedEmail !== DEFAULT_USER_EMAIL || password !== MOCK_PASSWORD) {
          return 'Email atau password salah. Silakan coba lagi.';
        }

        const user: AuthUser = {
          id: 'user-kyune',
          name: DEFAULT_USER_NAME,
          email: DEFAULT_USER_EMAIL,
        };

        set({ user, isAuthenticated: true });
        return null;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: STORAGE_KEYS.AUTH,
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
