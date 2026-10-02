"use client";

// Per-user progress. The prototype keeps it in localStorage; the MVP moves
// this exact shape to a database row per user so the UI doesn't change.

import { useCallback, useSyncExternalStore } from "react";
import type { ConceptTag } from "./types";

export const MAX_HEARTS = 5;
const HEART_REFILL_MS = 30 * 60 * 1000; // one heart every 30 minutes

export type LessonResult = { score: number; passed: boolean; completedAt: number };

export type Progress = {
  xp: number;
  hearts: number;
  heartsUpdatedAt: number;
  streak: number;
  lastActiveDay: string | null; // YYYY-MM-DD
  lessons: Record<string, LessonResult>;
  /** Per-concept mastery: correct / attempted. Drives review later. */
  mastery: Partial<Record<ConceptTag, { correct: number; attempted: number }>>;
};

const KEY = "academy.progress.v1";

const fresh = (): Progress => ({
  xp: 0,
  hearts: MAX_HEARTS,
  heartsUpdatedAt: Date.now(),
  streak: 0,
  lastActiveDay: null,
  lessons: {},
  mastery: {},
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Apply time-based heart regeneration. Pure. */
export function withRefilledHearts(p: Progress, now = Date.now()): Progress {
  if (p.hearts >= MAX_HEARTS) return { ...p, heartsUpdatedAt: now };
  const gained = Math.floor((now - p.heartsUpdatedAt) / HEART_REFILL_MS);
  if (gained <= 0) return p;
  return {
    ...p,
    hearts: Math.min(MAX_HEARTS, p.hearts + gained),
    heartsUpdatedAt: p.heartsUpdatedAt + gained * HEART_REFILL_MS,
  };
}

export function msUntilNextHeart(p: Progress, now = Date.now()) {
  if (p.hearts >= MAX_HEARTS) return 0;
  return Math.max(0, p.heartsUpdatedAt + HEART_REFILL_MS - now);
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    return withRefilledHearts({ ...fresh(), ...JSON.parse(raw) });
  } catch {
    return fresh();
  }
}

function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode etc. — progress just won't persist */
  }
}

// A tiny external store so every component sees the same progress object
// and the server render (no localStorage) stays consistent with hydration.
let cached: Progress | null = null;
const listeners = new Set<() => void>();
function getSnapshot() {
  if (cached === null) cached = load();
  return cached;
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setStore(next: Progress) {
  cached = next;
  save(next);
  listeners.forEach((l) => l());
}

export function useProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setStore(fn(withRefilledHearts(getSnapshot())));
  }, []);

  const loseHeart = useCallback(() => {
    update((p) => {
      const wasFull = p.hearts >= MAX_HEARTS;
      return {
        ...p,
        hearts: Math.max(0, p.hearts - 1),
        // start the refill clock when we drop below full
        heartsUpdatedAt: wasFull ? Date.now() : p.heartsUpdatedAt,
      };
    });
  }, [update]);

  const recordAnswer = useCallback(
    (tag: ConceptTag, correct: boolean) => {
      update((p) => {
        const m = p.mastery[tag] ?? { correct: 0, attempted: 0 };
        return {
          ...p,
          xp: p.xp + (correct ? 10 : 0),
          mastery: {
            ...p.mastery,
            [tag]: { correct: m.correct + (correct ? 1 : 0), attempted: m.attempted + 1 },
          },
        };
      });
    },
    [update],
  );

  const completeLesson = useCallback(
    (lessonId: string, score: number, passed: boolean) => {
      update((p) => {
        const day = today();
        const prevPassed = p.lessons[lessonId]?.passed;
        let streak = p.streak;
        if (passed && p.lastActiveDay !== day) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          streak = p.lastActiveDay === yesterday ? p.streak + 1 : 1;
        }
        const bonus = passed ? 20 + (score === 1 ? 10 : 0) : 0;
        return {
          ...p,
          xp: p.xp + bonus,
          streak,
          lastActiveDay: passed ? day : p.lastActiveDay,
          lessons: {
            ...p.lessons,
            [lessonId]: {
              score: Math.max(score, p.lessons[lessonId]?.score ?? 0),
              passed: passed || !!prevPassed,
              completedAt: Date.now(),
            },
          },
        };
      });
    },
    [update],
  );

  const reset = useCallback(() => update(() => fresh()), [update]);

  return { progress, loseHeart, recordAnswer, completeLesson, reset };
}
