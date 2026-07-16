import { create } from "zustand";
import { apiFetch, setToken, removeToken, getToken } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export interface AuthState {
  /** Current authenticated user, or null when not logged in. */
  user: User | null;
  /** JWT token stored in memory (mirrors localStorage). */
  token: string | null;
  /** Derived — true when both user and token are present. */
  isAuthenticated: boolean;
  /** True while any auth-related network request is in flight. */
  isLoading: boolean;

  /**
   * Authenticate with username + password.
   * On success the token is persisted via the api module and the user
   * object is stored in state.
   */
  login: (username: string, password: string) => Promise<AuthResult>;

  /**
   * Create a new account.
   * Does NOT log the user in — call login() separately after success
   * if automatic login is desired.
   */
  register: (
    username: string,
    password: string,
    email?: string,
  ) => Promise<AuthResult>;

  /** Clear all auth state and remove the stored token. */
  logout: () => void;

  /**
   * Fetch the current user profile from the server.
   * Requires a valid token to already be present.
   */
  fetchUser: () => Promise<AuthResult>;

  /**
   * Bootstrap the auth store on app mount.
   * Checks localStorage for an existing token; if one is found,
   * hydrates `token` and calls fetchUser() to recover the session.
   */
  init: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  // -- login ---------------------------------------------------------------

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const result = await apiFetch<{ data: { token: string; expiresIn: number; user: User } }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
        },
      );

      setToken(result.data.token);
      set({
        token: result.data.token,
        user: result.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return {
        success: false,
        error: extractErrorMessage(err, "Login failed"),
      };
    }
  },

  // -- register ------------------------------------------------------------

  register: async (username, password, email?) => {
    set({ isLoading: true });
    try {
      const body: Record<string, string> = { username, password };
      if (email !== undefined && email !== "") {
        body.email = email;
      }

      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      });

      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return {
        success: false,
        error: extractErrorMessage(err, "Registration failed"),
      };
    }
  },

  // -- logout --------------------------------------------------------------

  logout: () => {
    removeToken();
    set({ user: null, token: null, isAuthenticated: false });
  },

  // -- fetchUser -----------------------------------------------------------

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const result = await apiFetch<{ data: User }>("/user/me");
      set({ user: result.data, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return {
        success: false,
        error: extractErrorMessage(err, "Failed to fetch user"),
      };
    }
  },

  // -- init ----------------------------------------------------------------

  init: async () => {
    const storedToken = getToken();
    if (!storedToken) return;

    set({ token: storedToken });

    const { fetchUser } = get();
    await fetchUser();
  },
}));
