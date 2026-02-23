"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Match = {
  id: number;
  sport: string;
  homeTeam: string;
  awayTeam: string;
};

type MatchCreatePayload = {
  sport: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  endTime: string;
  homeScore?: number;
  awayScore?: number;
};

type CommentaryCreatePayload = {
  minutes: number;
  sequence?: number;
  period?: string;
  eventType?: string;
  actor?: string;
  team?: string;
  message: string;
  tags?: string[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const numberFromText = (value: string) => {
  const cleaned = value.trim();
  return cleaned.length === 0 ? undefined : Number(cleaned);
};

const toIsoOrThrow = (datetimeLocal: string) => {
  const date = new Date(datetimeLocal);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid datetime value.");
  }
  return date.toISOString();
};

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [matchFormStatus, setMatchFormStatus] = useState("");
  const [commentaryFormStatus, setCommentaryFormStatus] = useState("");

  const [matchForm, setMatchForm] = useState({
    sport: "Football",
    homeTeam: "",
    awayTeam: "",
    startTime: "",
    endTime: "",
    homeScore: "",
    awayScore: "",
  });

  const [commentaryForm, setCommentaryForm] = useState({
    minutes: "0",
    sequence: "",
    period: "regular",
    eventType: "update",
    actor: "",
    team: "",
    message: "",
    tags: "",
  });

  useEffect(() => {
    const loadMatches = async () => {
      const res = await fetch(`${API_BASE_URL}/api/matches?limit=100&sortBy=startTime&sortOrder=desc`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const payload = (await res.json()) as { data: Match[] };
      const items = payload.data ?? [];
      setMatches(items);
      setSelectedMatchId((prev) => prev ?? items[0]?.id ?? null);
    };

    void loadMatches();
  }, []);

  const createMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMatchFormStatus("");

    try {
      const payload: MatchCreatePayload = {
        sport: matchForm.sport.trim(),
        homeTeam: matchForm.homeTeam.trim(),
        awayTeam: matchForm.awayTeam.trim(),
        startTime: toIsoOrThrow(matchForm.startTime),
        endTime: toIsoOrThrow(matchForm.endTime),
      };

      const homeScore = numberFromText(matchForm.homeScore);
      const awayScore = numberFromText(matchForm.awayScore);
      if (homeScore !== undefined) payload.homeScore = homeScore;
      if (awayScore !== undefined) payload.awayScore = awayScore;

      const res = await fetch(`${API_BASE_URL}/api/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as (Match & { error?: never }) | { error?: string };
      if (!res.ok) throw new Error("error" in data && data.error ? data.error : "Failed to create match.");

      const created = data as Match;
      setMatches((prev) => [created, ...prev]);
      setSelectedMatchId(created.id);
      setMatchFormStatus("Match created successfully.");
    } catch (error) {
      setMatchFormStatus(error instanceof Error ? error.message : "Create match failed.");
    }
  };

  const createCommentary = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMatchId) {
      setCommentaryFormStatus("Select a match first.");
      return;
    }
    setCommentaryFormStatus("");

    try {
      const minutes = Number(commentaryForm.minutes);
      if (!Number.isInteger(minutes) || minutes < 0) {
        throw new Error("Minutes must be a non-negative integer.");
      }

      const payload: CommentaryCreatePayload = {
        minutes,
        message: commentaryForm.message.trim(),
        period: commentaryForm.period.trim() || undefined,
        eventType: commentaryForm.eventType.trim() || undefined,
        actor: commentaryForm.actor.trim() || undefined,
        team: commentaryForm.team.trim() || undefined,
      };

      const sequence = numberFromText(commentaryForm.sequence);
      if (sequence !== undefined) payload.sequence = sequence;

      const tags = commentaryForm.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (tags.length > 0) payload.tags = tags;

      const res = await fetch(`${API_BASE_URL}/api/matches/${selectedMatchId}/commentary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create commentary.");

      setCommentaryForm((prev) => ({ ...prev, message: "", tags: "", actor: "", team: "" }));
      setCommentaryFormStatus("Commentary pushed.");
    } catch (error) {
      setCommentaryFormStatus(error instanceof Error ? error.message : "Create commentary failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <header className="rounded-2xl border border-slate-800/90 bg-slate-900/85 p-4 shadow-xl shadow-black/20 backdrop-blur md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-orange-300/90">Control Room</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Admin Console</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-full border border-slate-700 bg-slate-800 px-4 py-1.5 text-sm font-semibold"
              >
                Viewer
              </Link>
              <Link
                href="/admin"
                className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-semibold text-slate-950"
              >
                Admin
              </Link>
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-2">
          <form
            className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg md:p-5"
            onSubmit={createMatch}
          >
            <h2 className="text-xl font-bold tracking-tight">Create Match</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-orange-400/30 transition focus:ring"
                placeholder="Sport"
                value={matchForm.sport}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, sport: event.target.value }))}
                required
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-orange-400/30 transition focus:ring"
                placeholder="Home Team"
                value={matchForm.homeTeam}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, homeTeam: event.target.value }))}
                required
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-orange-400/30 transition focus:ring"
                placeholder="Away Team"
                value={matchForm.awayTeam}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, awayTeam: event.target.value }))}
                required
              />
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-orange-400/30 transition focus:ring"
                value={matchForm.startTime}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, startTime: event.target.value }))}
                required
              />
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-orange-400/30 transition focus:ring"
                value={matchForm.endTime}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, endTime: event.target.value }))}
                required
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-orange-400/30 transition focus:ring"
                placeholder="Home Score (optional)"
                value={matchForm.homeScore}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, homeScore: event.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-orange-400/30 transition focus:ring"
                placeholder="Away Score (optional)"
                value={matchForm.awayScore}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, awayScore: event.target.value }))}
              />
            </div>
            <button
              className="mt-4 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              type="submit"
            >
              Create Match
            </button>
            {matchFormStatus ? <p className="mt-2 text-sm text-slate-300">{matchFormStatus}</p> : null}
          </form>

          <form
            className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg md:p-5"
            onSubmit={createCommentary}
          >
            <h2 className="text-xl font-bold tracking-tight">Push Commentary</h2>
            <div className="mt-3">
              <label className="text-sm text-slate-300">Target match</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400/30 transition focus:ring"
                value={selectedMatchId ?? ""}
                onChange={(event) => setSelectedMatchId(Number(event.target.value) || null)}
              >
                {matches.length === 0 ? <option value="">No matches</option> : null}
                {matches.map((item) => (
                  <option key={item.id} value={item.id}>
                    #{item.id} {item.homeTeam} vs {item.awayTeam}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400/30 transition focus:ring"
                type="number"
                min={0}
                placeholder="Minutes"
                value={commentaryForm.minutes}
                onChange={(event) => setCommentaryForm((prev) => ({ ...prev, minutes: event.target.value }))}
                required
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400/30 transition focus:ring"
                type="number"
                min={1}
                placeholder="Sequence (optional)"
                value={commentaryForm.sequence}
                onChange={(event) => setCommentaryForm((prev) => ({ ...prev, sequence: event.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400/30 transition focus:ring"
                placeholder="Period"
                value={commentaryForm.period}
                onChange={(event) => setCommentaryForm((prev) => ({ ...prev, period: event.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400/30 transition focus:ring"
                placeholder="Event Type"
                value={commentaryForm.eventType}
                onChange={(event) => setCommentaryForm((prev) => ({ ...prev, eventType: event.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400/30 transition focus:ring"
                placeholder="Actor (optional)"
                value={commentaryForm.actor}
                onChange={(event) => setCommentaryForm((prev) => ({ ...prev, actor: event.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400/30 transition focus:ring"
                placeholder="Team (optional)"
                value={commentaryForm.team}
                onChange={(event) => setCommentaryForm((prev) => ({ ...prev, team: event.target.value }))}
              />
            </div>

            <textarea
              className="mt-3 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400/30 transition focus:ring"
              placeholder="Commentary message"
              value={commentaryForm.message}
              onChange={(event) => setCommentaryForm((prev) => ({ ...prev, message: event.target.value }))}
              required
            />
            <input
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400/30 transition focus:ring"
              placeholder="Tags (comma separated)"
              value={commentaryForm.tags}
              onChange={(event) => setCommentaryForm((prev) => ({ ...prev, tags: event.target.value }))}
            />
            <button
              className="mt-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              type="submit"
              disabled={!selectedMatchId}
            >
              Push Commentary
            </button>
            {commentaryFormStatus ? <p className="mt-2 text-sm text-slate-300">{commentaryFormStatus}</p> : null}
          </form>
        </main>
      </div>
    </div>
  );
}
