"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Match = {
  id: number;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  status: "scheduled" | "live" | "finished";
  startTime: string;
  endTime: string | null;
  homeScore: number;
  awayScore: number;
  createdAt: string;
};

type Commentary = {
  id: number;
  matchId: number;
  minutes: number;
  sequence: number;
  period: string;
  eventType: string;
  actor: string | null;
  team: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  createdAt: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  API_BASE_URL.replace(/^http/i, "ws").replace(/\/$/, "") + "/ws";

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [commentary, setCommentary] = useState<Commentary[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingCommentary, setLoadingCommentary] = useState(false);
  const [wsState, setWsState] = useState<"connecting" | "open" | "closed">("connecting");
  const [errorText, setErrorText] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const activeSubscriptionRef = useRef<number | null>(null);
  const selectedMatchIdRef = useRef<number | null>(null);

  const selectedMatch = useMemo(
    () => matches.find((item) => item.id === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  );

  useEffect(() => {
    selectedMatchIdRef.current = selectedMatchId;
  }, [selectedMatchId]);

  useEffect(() => {
    const loadMatches = async () => {
      setLoadingMatches(true);
      setErrorText("");
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/matches?limit=100&sortBy=startTime&sortOrder=desc`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("Failed to load matches.");
        const payload = (await res.json()) as { data: Match[] };
        const items = payload.data ?? [];
        setMatches(items);
        setSelectedMatchId((prev) => prev ?? items[0]?.id ?? null);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "Failed to load data.");
      } finally {
        setLoadingMatches(false);
      }
    };

    void loadMatches();
  }, []);

  useEffect(() => {
    if (!selectedMatchId) {
      setCommentary([]);
      return;
    }

    const loadCommentary = async () => {
      setLoadingCommentary(true);
      setErrorText("");
      try {
        const res = await fetch(`${API_BASE_URL}/api/matches/${selectedMatchId}/commentary?limit=100`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load commentary.");
        const payload = (await res.json()) as { data: Commentary[] };
        setCommentary(payload.data ?? []);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "Failed to load commentary.");
      } finally {
        setLoadingCommentary(false);
      }
    };

    void loadCommentary();
  }, [selectedMatchId]);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isClosedManually = false;

    const connect = () => {
      setWsState("connecting");
      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsState("open");
        const currentSelected = selectedMatchIdRef.current;
        if (currentSelected) {
          socket.send(JSON.stringify({ type: "subscribe", matchId: currentSelected }));
          activeSubscriptionRef.current = currentSelected;
        }
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as {
            event?: string;
            data?: Match | Commentary;
          };

          if (payload.event === "matchCreated" && payload.data) {
            const incoming = payload.data as Match;
            setMatches((prev) => {
              if (prev.some((item) => item.id === incoming.id)) return prev;
              return [incoming, ...prev];
            });
            return;
          }

          if (payload.event === "commentary" && payload.data) {
            const incoming = payload.data as Commentary;
            if (incoming.matchId !== selectedMatchIdRef.current) return;
            setCommentary((prev) => {
              if (prev.some((item) => item.id === incoming.id)) return prev;
              return [incoming, ...prev];
            });
          }
        } catch {
          return;
        }
      };

      socket.onclose = () => {
        setWsState("closed");
        wsRef.current = null;
        if (!isClosedManually) reconnectTimer = setTimeout(connect, 1800);
      };

      socket.onerror = () => {
        setWsState("closed");
      };
    };

    connect();

    return () => {
      isClosedManually = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
      activeSubscriptionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const current = activeSubscriptionRef.current;
    if (current && current !== selectedMatchId) {
      socket.send(JSON.stringify({ type: "unsubscribe", matchId: current }));
    }
    if (selectedMatchId && current !== selectedMatchId) {
      socket.send(JSON.stringify({ type: "subscribe", matchId: selectedMatchId }));
      activeSubscriptionRef.current = selectedMatchId;
    }
  }, [selectedMatchId]);

  const wsChipClass =
    wsState === "open"
      ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
      : wsState === "connecting"
        ? "border-amber-400/40 bg-amber-500/20 text-amber-200"
        : "border-rose-400/40 bg-rose-500/20 text-rose-200";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <header className="rounded-2xl border border-slate-800/90 bg-slate-900/85 p-4 shadow-xl shadow-black/20 backdrop-blur md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/90">Sportz Live</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Match Commentary Viewer</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-full bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-slate-950"
              >
                Viewer
              </Link>
              <Link
                href="/admin"
                className="rounded-full border border-slate-700 bg-slate-800 px-4 py-1.5 text-sm font-semibold"
              >
                Admin
              </Link>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${wsChipClass}`}>
                WS: {wsState}
              </span>
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/60 p-4 shadow-lg md:p-5">
            <label htmlFor="match-select" className="text-sm font-medium text-slate-300">
              Select match
            </label>
            <select
              id="match-select"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400/30 transition focus:ring"
              value={selectedMatchId ?? ""}
              onChange={(event) => setSelectedMatchId(Number(event.target.value) || null)}
              disabled={loadingMatches || matches.length === 0}
            >
              {matches.length === 0 ? <option value="">No matches</option> : null}
              {matches.map((item) => (
                <option key={item.id} value={item.id}>
                  #{item.id} {item.homeTeam} vs {item.awayTeam}
                </option>
              ))}
            </select>

            {selectedMatch ? (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/85">{selectedMatch.sport}</p>
                <h2 className="mt-2 text-xl font-bold leading-tight">
                  {selectedMatch.homeTeam} <span className="text-cyan-300">{selectedMatch.homeScore}</span> -{" "}
                  <span className="text-cyan-300">{selectedMatch.awayScore}</span> {selectedMatch.awayTeam}
                </h2>
                <p className="mt-2 text-xs text-slate-400">
                  {selectedMatch.status.toUpperCase()} | {new Date(selectedMatch.startTime).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No match selected.</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg md:p-5">
            <div className="mb-4 flex items-end justify-between gap-2">
              <h3 className="text-xl font-bold tracking-tight">Commentary Feed</h3>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Newest first</p>
            </div>

            {loadingCommentary ? <p className="text-sm text-slate-400">Loading commentary...</p> : null}
            {!loadingCommentary && commentary.length === 0 ? (
              <p className="text-sm text-slate-400">No commentary yet.</p>
            ) : null}

            <ul className="space-y-3">
              {commentary.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-cyan-400/40"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {item.minutes}&apos; {item.eventType}
                    </p>
                    <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-200">{item.message}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {item.team ? `${item.team} | ` : ""}
                    {item.actor ? `${item.actor} | ` : ""}
                    {item.period}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </main>

        {errorText ? <p className="text-sm text-rose-300">{errorText}</p> : null}
      </div>
    </div>
  );
}
