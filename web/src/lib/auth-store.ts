"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  balanceUsd: number;
  country: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  clear: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      updateUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
      clear: () => set({ token: null, user: null }),
    }),
    { name: "tradeflow-auth" },
  ),
);

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const headers = new Headers(opts.headers || {});
  if (opts.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);
  let res: Response;
  try {
    res = await fetch(path, { ...opts, headers, cache: opts.cache ?? "no-store" });
  } catch {
    throw new Error("Network error — check that the app server is running");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}
