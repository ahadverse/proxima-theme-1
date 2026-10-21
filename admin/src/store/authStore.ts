import { create } from 'zustand';
import type { AdminUser } from '@/types/admin';
import { api, setUnauthorizedHandler } from '@/lib/api';

// A returning admin's identity is remembered so the app can render straight away and confirm the
// session in the background — instead of a blocking full-screen spinner followed by a second,
// page-level loading state (a two-step "loading… then loading again" waterfall). This is only a
// UI hint: the httpOnly session cookie is still the real credential, and any 401 (from the
// background check or from a page's own requests) immediately drops back to the login screen.
const SESSION_HINT_KEY = 'maroon-admin-session';

function readSessionHint(): AdminUser | null {
  try {
    const raw = localStorage.getItem(SESSION_HINT_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

function writeSessionHint(admin: AdminUser | null) {
  try {
    if (admin) localStorage.setItem(SESSION_HINT_KEY, JSON.stringify(admin));
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Storage blocked — only the faster first paint is lost.
  }
}

interface AuthState {
  admin: AdminUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  /** True once the session has been confirmed with the server during this page load. */
  isVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

let inflightMe: Promise<void> | null = null;
const hinted = readSessionHint();

export const useAuthStore = create<AuthState>((set, get) => ({
  admin: hinted,
  status: hinted ? 'authenticated' : 'idle',
  isVerified: false,

  login: async (email, password) => {
    const res = await api.post('/admin/auth/login', { email, password });
    writeSessionHint(res.data.data);
    set({ admin: res.data.data, status: 'authenticated', isVerified: true });
  },

  logout: async () => {
    await api.post('/admin/auth/logout');
    writeSessionHint(null);
    set({ admin: null, status: 'unauthenticated', isVerified: true });
  },

  // Shared in-flight promise so React's double-invoked effects (and re-renders) never send two.
  fetchMe: () => {
    inflightMe ??= (async () => {
      // Only a visitor with no remembered session sees the blocking splash; a returning admin
      // keeps seeing the app while this runs.
      if (get().status === 'idle') set({ status: 'loading' });
      try {
        const res = await api.get('/admin/auth/me');
        writeSessionHint(res.data.data);
        set({ admin: res.data.data, status: 'authenticated', isVerified: true });
      } catch {
        writeSessionHint(null);
        set({ admin: null, status: 'unauthenticated', isVerified: true });
      } finally {
        inflightMe = null;
      }
    })();
    return inflightMe;
  },
}));

// Any 401 from any API call (e.g. a session that expired while a CRUD page was open) drops the
// admin back to the login screen via ProtectedRoute, which re-renders on this status change.
setUnauthorizedHandler(() => {
  writeSessionHint(null);
  useAuthStore.setState({ admin: null, status: 'unauthenticated', isVerified: true });
});
