"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Choice from "./exercises/Choice";
import Classify from "./exercises/Classify";
import OptionsLab from "./exercises/OptionsLab";
import Replay from "./exercises/Replay";
import TapCandle from "./exercises/TapCandle";
import TapSwings from "./exercises/TapSwings";
import Teach from "./exercises/Teach";
import { useProgress } from "@/lib/progress";
import type { Lesson } from "@/lib/types";

const PASS = 0.7;
const CHECKPOINT_PASS = 0.85;

export default function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const { progress, loseHeart, recordAnswer, completeLesson } = useProgress();
  const [i, setI] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState<"passed" | "failed" | "out-of-hearts" | null>(null);

  const graded = useMemo(() => lesson.exercises.filter((e) => e.type !== "teach").length, [lesson]);
  const ex = lesson.exercises[i];
  const correctCount = results.filter(Boolean).length;
  const score = graded ? correctCount / graded : 1;
  const threshold = lesson.checkpoint ? CHECKPOINT_PASS : PASS;

  // A lesson can't start with no hearts.
  const outOfHearts = progress !== null && progress.hearts <= 0 && results.length === 0 && !done;

  useEffect(() => {
    if (done === "passed" || done === "failed") completeLesson(lesson.id, score, done === "passed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const onAnswer = (correct: boolean) => {
    recordAnswer(ex.tag, correct);
    setResults((r) => [...r, correct]);
    if (!correct) loseHeart();
  };

  const next = () => {
    const heartsLeft = (progress?.hearts ?? 1) > 0;
    if (!heartsLeft) return setDone("out-of-hearts");
    if (i + 1 >= lesson.exercises.length) {
      return setDone(score >= threshold ? "passed" : "failed");
    }
    setI(i + 1);
  };

  if (progress === null) return null;

  if (outOfHearts || done === "out-of-hearts") {
    return (
      <End
        title="Out of hearts"
        body="Every wrong answer costs a heart, the same way a bad trade costs capital. Hearts refill one every 30 minutes. Review the lesson and come back."
        xp={null}
      />
    );
  }
  if (done === "passed") {
    return (
      <End
        title={score === 1 ? "Perfect lesson" : "Lesson complete"}
        body={`You scored ${correctCount}/${graded}.`}
        xp={20 + (score === 1 ? 10 : 0) + correctCount * 10}
      />
    );
  }
  if (done === "failed") {
    return (
      <End
        title="Not yet"
        body={`You scored ${correctCount}/${graded}. ${lesson.checkpoint ? "Checkpoints need 85%." : "You need 70% to pass."} Go through it again; repetition is the point.`}
        xp={correctCount * 10}
      />
    );
  }

  const pct = (i / lesson.exercises.length) * 100;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Quit lesson" className="text-2xl text-zinc-500">
          ×
        </Link>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <Hearts n={progress.hearts} />
      </div>

      {ex.type === "teach" && <Teach key={ex.id} ex={ex} onDone={next} />}
      {ex.type === "choice" && <Choice key={ex.id} ex={ex} onAnswer={onAnswer} onNext={next} />}
      {ex.type === "classify" && <Classify key={ex.id} ex={ex} onAnswer={onAnswer} onNext={next} />}
      {ex.type === "tap-swings" && <TapSwings key={ex.id} ex={ex} onAnswer={onAnswer} onNext={next} />}
      {ex.type === "tap-candle" && <TapCandle key={ex.id} ex={ex} onAnswer={onAnswer} onNext={next} />}
      {ex.type === "replay" && <Replay key={ex.id} ex={ex} onAnswer={onAnswer} onNext={next} />}
      {ex.type === "options-lab" && <OptionsLab key={ex.id} ex={ex} onAnswer={onAnswer} onNext={next} />}
    </div>
  );
}

export function Hearts({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-1 text-red-500" aria-label={`${n} hearts`}>
      <span>♥</span>
      <span className="font-bold">{n}</span>
    </div>
  );
}

function End({ title, body, xp }: { title: string; body: string; xp: number | null }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-zinc-300">{body}</p>
      {xp !== null && <div className="text-xl font-bold text-amber-400">+{xp} XP</div>}
      <Link href="/" className="btn-primary w-full">
        Back to path
      </Link>
    </div>
  );
}
