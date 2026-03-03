"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Note, type NoteCreate } from "@/lib/api";

type Props = {
  onLogout: () => void;
  userEmail?: string;
};

type Status = "idle" | "loading" | "error";

function formatTitle(note: Note) {
  const t = note.title?.trim();
  if (t) return t;
  const firstLine = note.content?.split("\n")[0]?.trim();
  return firstLine?.slice(0, 60) || "Untitled";
}

/**
 * PUBLIC_INTERFACE
 * Main notes workspace (search/list/filter + editor).
 */
export function NotesWorkspace({ onLogout, userEmail }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string>("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [notes, selectedId],
  );

  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftTags, setDraftTags] = useState("");

  const canSave = useMemo(() => {
    const t = draftTitle.trim();
    const c = draftContent.trim();
    return t.length > 0 || c.length > 0;
  }, [draftTitle, draftContent]);

  async function load() {
    setStatus("loading");
    setError(null);

    const [notesRes, tagsRes] = await Promise.all([
      api.listNotes({ search: search.trim() || undefined, tag: activeTag || undefined }),
      api.listTags(),
    ]);

    if (!notesRes.ok) {
      setStatus("error");
      setError(notesRes.error.message);
      return;
    }
    setNotes(notesRes.data);

    // Tags are optional; ignore failure.
    if (tagsRes.ok) setTags(tagsRes.data);
    setStatus("idle");
  }

  // Initial load
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when search/filter changes (debounced-ish)
  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeTag]);

  // Populate editor when selection changes
  useEffect(() => {
    if (!selectedNote) {
      setDraftTitle("");
      setDraftContent("");
      setDraftTags("");
      return;
    }
    setDraftTitle(selectedNote.title || "");
    setDraftContent(selectedNote.content || "");
    setDraftTags((selectedNote.tags || []).join(", "));
  }, [selectedNote]);

  async function onNewNote() {
    setSelectedId(null);
    setDraftTitle("");
    setDraftContent("");
    setDraftTags("");
  }

  async function onSave() {
    setError(null);

    const tagsArr = draftTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: NoteCreate = {
      title: draftTitle.trim(),
      content: draftContent,
      tags: tagsArr.length ? tagsArr : undefined,
    };

    if (!canSave) return;

    setStatus("loading");
    try {
      if (!selectedId) {
        const created = await api.createNote(payload);
        if (!created.ok) {
          setError(created.error.message);
          setStatus("error");
          return;
        }
        setNotes((prev) => [created.data, ...prev]);
        setSelectedId(created.data.id);
      } else {
        const updated = await api.updateNote(selectedId, payload);
        if (!updated.ok) {
          setError(updated.error.message);
          setStatus("error");
          return;
        }
        setNotes((prev) =>
          prev.map((n) => (n.id === selectedId ? updated.data : n)),
        );
      }
      setStatus("idle");
      // refresh tags list opportunistically
      const newTags = new Set<string>();
      for (const n of notes) (n.tags || []).forEach((t) => newTags.add(t));
      tagsArr.forEach((t) => newTags.add(t));
      setTags(Array.from(newTags).sort((a, b) => a.localeCompare(b)));
    } finally {
      if (status !== "error") setStatus("idle");
    }
  }

  async function onDelete() {
    if (!selectedId) return;
    setError(null);

    setStatus("loading");
    const res = await api.deleteNote(selectedId);
    if (!res.ok) {
      setStatus("error");
      setError(res.error.message);
      return;
    }

    setNotes((prev) => prev.filter((n) => n.id !== selectedId));
    setSelectedId(null);
    setDraftTitle("");
    setDraftContent("");
    setDraftTags("");
    setStatus("idle");
  }

  return (
    <div className="container">
      <header className="card">
        <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="brand">
            <div className="brandBadge" aria-hidden="true" />
            <div>
              <div className="hTitle">Notemaster</div>
              <div className="hSubtitle">
                {userEmail ? `Signed in as ${userEmail}` : "Your notes, synced."}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" className="btn btnPrimary" onClick={onNewNote}>
              New Note
            </button>
            <button type="button" className="btn" onClick={() => void load()}>
              Refresh
            </button>
            <button type="button" className="btn btnDanger" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mt-4 grid">
        <aside className="card">
          <div className="p-4 md:p-5">
            <label className="label" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find by title/content…"
            />

            <div className="mt-4">
              <div className="label">Tags</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`pill ${activeTag === "" ? "pillActive" : ""}`}
                  onClick={() => setActiveTag("")}
                >
                  All
                </button>
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`pill ${activeTag === t ? "pillActive" : ""}`}
                    onClick={() => setActiveTag(t)}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="label">Notes</div>

              {status === "loading" ? (
                <div className="mt-2 pill">Loading…</div>
              ) : null}

              {status === "error" && error ? (
                <div
                  role="alert"
                  className="mt-2 pill"
                  style={{
                    borderColor: "rgba(239, 68, 68, 0.55)",
                    background: "rgba(239, 68, 68, 0.12)",
                  }}
                >
                  {error}
                </div>
              ) : null}

              <div className="mt-3 grid gap-2">
                {notes.length === 0 ? (
                  <div className="pill" style={{ color: "var(--muted)" }}>
                    No notes yet. Create one.
                  </div>
                ) : null}

                {notes.map((n) => {
                  const active = n.id === selectedId;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={`btn ${active ? "btnPrimary" : ""}`}
                      onClick={() => setSelectedId(n.id)}
                      style={{
                        width: "100%",
                        justifyContent: "space-between",
                        textTransform: "none",
                        letterSpacing: "0.1px",
                        fontFamily: "var(--sans)",
                        fontWeight: 650,
                      }}
                    >
                      <span style={{ textAlign: "left" }}>{formatTitle(n)}</span>
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>
                        {(n.tags || []).slice(0, 2).map((t) => `#${t}`).join(" ")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <section className="card">
          <div className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="hTitle">
                  {selectedId ? "Edit Note" : "New Note"}
                </div>
                <div className="hSubtitle">
                  Autosave is not enabled — hit SAVE.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btnPrimary"
                  onClick={() => void onSave()}
                  disabled={!canSave || status === "loading"}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn btnDanger"
                  onClick={() => void onDelete()}
                  disabled={!selectedId || status === "loading"}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div>
                <label className="label" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  className="input"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Untitled note"
                />
              </div>

              <div>
                <label className="label" htmlFor="tags">
                  Tags (comma-separated)
                </label>
                <input
                  id="tags"
                  className="input"
                  value={draftTags}
                  onChange={(e) => setDraftTags(e.target.value)}
                  placeholder="work, ideas, todo"
                />
              </div>

              <div>
                <label className="label" htmlFor="content">
                  Content
                </label>
                <textarea
                  id="content"
                  className="textarea"
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Write something awesome…"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
