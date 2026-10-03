"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { requestCode, useAuth, verifyCode } from "@/lib/supabase/auth";

export default function Login() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in: nothing to do here.
  useEffect(() => {
    if (auth.ready && auth.userId) router.replace("/");
  }, [auth.ready, auth.userId, router]);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestCode(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      await verifyCode(email.trim(), code.trim());
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code didn't work.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-6">
      <Link href="/" className="text-sm text-zinc-400">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold">Save your progress</h1>
      {!auth.configured && auth.ready ? (
        <p className="text-zinc-400">
          Sign-in isn&apos;t set up on this build yet. Your progress is saved on this device.
        </p>
      ) : !sent ? (
        <>
          <p className="text-zinc-300">
            Enter your email and we&apos;ll send a 6-digit code. No password to remember.
          </p>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base"
          />
          <button disabled={busy || !email.includes("@")} onClick={send} className="btn-primary">
            {busy ? "Sending…" : "Send code"}
          </button>
        </>
      ) : (
        <>
          <p className="text-zinc-300">
            We sent a code to <b>{email}</b>. Enter it below.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em]"
          />
          <button disabled={busy || code.trim().length < 6} onClick={verify} className="btn-primary">
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button onClick={() => setSent(false)} className="text-sm text-zinc-400">
            Use a different email
          </button>
        </>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
