const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const TOKEN_KEY = "auth_token";

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  role: string;
};

// ── Token storage ──────────────────────────────────────────────────────────
// Token is stored in localStorage for API calls and mirrored as a plain
// cookie so Next.js middleware (server-side) can read it for route protection.

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax; max-age=28800`; // 8h
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ── Auth API calls ─────────────────────────────────────────────────────────

export async function login(
  username: string,
  password: string
): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = (await res.json()) as { error?: { message?: string } };
    throw new Error(data.error?.message || "Login failed");
  }

  const data = (await res.json()) as { token: string; user: AuthUser };
  setToken(data.token);
  return data.user;
}

export async function logout(): Promise<void> {
  const token = getToken();
  // Best-effort server notification — client clears token regardless.
  if (token) {
    fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  clearToken();
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    clearToken();
    return null;
  }

  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}
