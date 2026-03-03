"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, type User } from "@/lib/api";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: User };

type UseAuthValue = {
  state: AuthState;
  token: string | null;
  refresh: () => Promise<void>;
  logout: () => void;
};

/**
 * PUBLIC_INTERFACE
 * Client-side auth state (token + /users/me).
 */
export function useAuth(): UseAuthValue {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [token, setTokenState] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const t = getToken();
    setTokenState(t);
    if (!t) {
      setState({ status: "anonymous" });
      return;
    }

    setState({ status: "loading" });
    const me = await api.me();
    if (!me.ok) {
      // token may have been cleared by api client on 401
      const t2 = getToken();
      setTokenState(t2);
      setState({ status: "anonymous" });
      return;
    }
    setState({ status: "authenticated", user: me.data });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setState({ status: "anonymous" });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({ state, token, refresh, logout }),
    [state, token, refresh, logout],
  );
}
