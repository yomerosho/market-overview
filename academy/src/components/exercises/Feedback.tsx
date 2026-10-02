"use client";

export default function Feedback({
  correct,
  explain,
  onNext,
}: {
  correct: boolean;
  explain: string;
  onNext: () => void;
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${
        correct ? "border-emerald-700 bg-emerald-950" : "border-red-800 bg-red-950"
      }`}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-3">
        <div className={`text-lg font-bold ${correct ? "text-emerald-300" : "text-red-300"}`}>
          {correct ? "Correct" : "Not quite"}
        </div>
        <p className="text-sm text-zinc-200">{explain}</p>
        <button onClick={onNext} className={correct ? "btn-primary" : "btn-danger"}>
          Continue
        </button>
      </div>
    </div>
  );
}
