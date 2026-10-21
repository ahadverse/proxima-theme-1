'use client';

import { create } from 'zustand';
import { apiGet, apiMutate } from '@/lib/api';
import type { CustomerUser } from '@/types/user';

type Outcome = { ok: boolean; message: string };

// The session itself is an httpOnly cookie the page can't see. This flag says "this browser signed in", so a
// first-time visitor's page doesn't ask /auth/me who they are just to be told 401 (which the browser logs as
// an error in the console, on every product page, for every anonymous shopper).
const SESSION_HINT_KEY = 'maroon-has-session';

function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    // Storage blocked — fall back to asking the server, as before.
    return true;
  }
}

function setSessionHint(on: boolean) {
  try {
    if (on) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Nothing to do — see hasSessionHint.
  }
}

export interface AddressInput {
  label: string;
  fullAddress: string;
  area: 'inside_dhaka' | 'outside_dhaka';
  isDefault?: boolean;
}

interface AuthState {
  user: CustomerUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  fetchMe: () => Promise<void>;
  login: (phone: string, password: string) => Promise<Outcome>;
  register: (data: { name: string; phone: string; email?: string; password: string }) => Promise<Outcome>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<Outcome>;
  addAddress: (data: AddressInput) => Promise<Outcome>;
  updateAddress: (id: string, data: Partial<AddressInput>) => Promise<Outcome>;
  deleteAddress: (id: string) => Promise<Outcome>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<Outcome>;
}

export const useAuthStore = create<AuthState>((set) => {
  // Sign-in, registration and every account edit answer with the customer's up-to-date profile,
  // which simply becomes the new `user`.
  async function adoptProfile(
    path: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: unknown,
    status?: 'authenticated'
  ): Promise<Outcome> {
    const result = await apiMutate<CustomerUser>(path, method, body);
    if (result.ok && result.data) {
      if (status) setSessionHint(true);
      set({ user: result.data, ...(status ? { status } : {}) });
    }
    return { ok: result.ok, message: result.message };
  }

  return {
    user: null,
    status: 'idle',

    fetchMe: async () => {
      if (!hasSessionHint()) {
        set({ user: null, status: 'unauthenticated' });
        return;
      }
      set({ status: 'loading' });
      const user = await apiGet<CustomerUser>('/auth/me');
      // An expired or revoked session: stop asking until the next sign-in.
      if (!user) setSessionHint(false);
      set({ user, status: user ? 'authenticated' : 'unauthenticated' });
    },

    login: (phone, password) => adoptProfile('/auth/login', 'POST', { phone, password }, 'authenticated'),
    register: (data) => adoptProfile('/auth/register', 'POST', data, 'authenticated'),

    logout: async () => {
      await apiMutate('/auth/logout', 'POST');
      setSessionHint(false);
      set({ user: null, status: 'unauthenticated' });
    },

    updateProfile: (data) => adoptProfile('/auth/me', 'PATCH', data),
    addAddress: (data) => adoptProfile('/auth/me/addresses', 'POST', data),
    updateAddress: (id, data) => adoptProfile(`/auth/me/addresses/${id}`, 'PATCH', data),
    deleteAddress: (id) => adoptProfile(`/auth/me/addresses/${id}`, 'DELETE'),

    changePassword: async (currentPassword, newPassword) => {
      const result = await apiMutate('/auth/me/password', 'PATCH', { currentPassword, newPassword });
      return { ok: result.ok, message: result.message };
    },
  };
});
