import { useState, useEffect, useRef } from "react";

const logoCache: Record<string, string | null> = {};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const scoreTeamMatch = (team: any, query: string) => {
  const names = [team?.strTeam, team?.strTeamShort, team?.strTeamAlternate].filter(Boolean).map(normalize);

  if (names.some((name) => name === query)) return 100;
  if (names.some((name) => name.startsWith(query))) return 80;
  if (names.some((name) => name.includes(query))) return 60;
  return 0;
};

export const useTeamLogo = (teamName: string) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(logoCache[teamName] ?? null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();

    if (!teamName || teamName.length < 3) {
      setLogoUrl(null);
      setLoading(false);
      return;
    }

    if (logoCache[teamName] !== undefined) {
      setLogoUrl(logoCache[teamName]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`,
          { signal: controller.signal }
        );
        const data = await res.json();

        const query = normalize(teamName);
        const teams = data.teams || [];

        const best = teams
          .map((team: any) => ({ team, score: scoreTeamMatch(team, query) }))
          .sort((a: any, b: any) => b.score - a.score)[0];

        const badge = best?.score >= 60 ? best.team?.strBadge || null : null;

        logoCache[teamName] = badge;
        if (!controller.signal.aborted) {
          setLogoUrl(badge);
          setLoading(false);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          logoCache[teamName] = null;
          setLogoUrl(null);
          setLoading(false);
        }
      }
    }, 600);

    return () => {
      clearTimeout(timerRef.current);
      controller.abort();
    };
  }, [teamName]);

  return { logoUrl, loading };
};
