"use client";

import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { NotesWorkspace } from "@/components/NotesWorkspace";
import { useAuth } from "@/hooks/useAuth";

/**
 * PUBLIC_INTERFACE
 * App entry route: shows auth (login/register) until authenticated, then the notes workspace.
 */
export default function Home() {
  const auth = useAuth();
  const [authNudge, setAuthNudge] = useState(0);

  // authNudge is used to force a refresh after login to fetch /users/me.
  async function onAuthed() {
    setAuthNudge((x) => x + 1);
    await auth.refresh();
  }

  if (auth.state.status === "loading") {
    return (
      <main className="container">
        <section className="card">
          <div className="p-8">
            <div className="hTitle">Booting…</div>
            <div className="hSubtitle">Connecting to the neon grid.</div>
            <div className="mt-4 pill">Loading</div>
          </div>
        </section>
      </main>
    );
  }

  if (auth.state.status === "anonymous") {
    return (
      <main className="container" key={authNudge}>
        <div className="max-w-xl mx-auto">
          <AuthCard onAuthed={onAuthed} />
        </div>
      </main>
    );
  }

  return (
    <main key={authNudge}>
      <NotesWorkspace
        userEmail={auth.state.user.email}
        onLogout={auth.logout}
      />
    </main>
  );
}
