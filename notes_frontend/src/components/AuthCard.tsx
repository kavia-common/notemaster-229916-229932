"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";

type Props = {
  onAuthed: () => void;
};

type Mode = "login" | "register";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * PUBLIC_INTERFACE
 * Authentication UI (login/register) used on the landing page.
 */
export function AuthCard({ onAuthed }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ctaText = useMemo(
    () => (mode === "login" ? "Sign In" : "Create Account"),
    [mode],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "register") {
        const reg = await api.register(email, password);
        if (!reg.ok) {
          setError(reg.error.message);
          return;
        }
      }

      const login = await api.login(email, password);
      if (!login.ok) {
        setError(login.error.message);
        return;
      }
      onAuthed();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-label="Authentication">
      <div className="p-6 md:p-8">
        <div className="brand">
          <div className="brandBadge" aria-hidden="true" />
          <div>
            <div className="hTitle">Notemaster</div>
            <div className="hSubtitle">
              Retro notes. Fast search. No distractions.
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            className={`btn ${mode === "login" ? "btnPrimary" : "btnGhost"}`}
            onClick={() => setMode("login")}
            aria-pressed={mode === "login"}
          >
            Login
          </button>
          <button
            type="button"
            className={`btn ${mode === "register" ? "btnPrimary" : "btnGhost"}`}
            onClick={() => setMode("register")}
            aria-pressed={mode === "register"}
          >
            Register
          </button>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="pill"
              style={{
                borderColor: "rgba(239, 68, 68, 0.55)",
                background: "rgba(239, 68, 68, 0.12)",
              }}
            >
              {error}
            </div>
          ) : null}

          <button className="btn btnPrimary" disabled={busy} type="submit">
            {busy ? "Working..." : ctaText}
          </button>

          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Tip: configure <span style={{ fontFamily: "var(--mono)" }}>
              NEXT_PUBLIC_API_BASE_URL
            </span>{" "}
            to point to the FastAPI backend.
          </p>
        </form>
      </div>
    </section>
  );
}
