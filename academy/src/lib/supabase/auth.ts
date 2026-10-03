"use client";

// Who is signed in, if anyone. Also the one place that wires sign-in and
// sign-out to the progress mirror.

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";
import { attachRemote, detachRemote } from "../progress";

export type AuthState = {
  /** null until the client has checked for a session. */
  ready: boolean;
  configured: boolean;
  email: string | null;
  userId: string | null;
  plan: "free" | "premium";
};

let state: AuthState = { ready: false, configured: false, email: null, userId: null, plan: "free" };
const listeners = new Set<() => void>();
let started = false;

function set(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

async function applySession(session: Session | null) {
  if (session?.user) {
    set({ email: session.user.email ?? null, userId: session.user.id });
    await attachRemote(session.user.id);
    const sb = supabase();
    const { data } = await sb!.from("profiles").select("plan").eq("user_id", session.user.id).maybeSingle();
    set({ plan: data?.plan === "premium" ? "premium" : "free", ready: true });
  } else {
    detachRemote();
    set({ email: null, userId: null, plan: "free", ready: true });
  }
}

function start() {
  if (started) return;
  started = true;
  const sb = supabase();
  if (!sb) {
    set({ ready: true, configured: false });
    return;
  }
  set({ configured: true });
  sb.auth.getSession().then(({ data }) => applySession(data.session));
  sb.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") applySession(session);
  });
}

export function useAuth() {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    start();
    const l = () => setSnap(state);
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return snap;
}

/** Email a 6-digit code. */
export async function requestCode(email: string) {
  const sb = supabase();
  if (!sb) throw new Error("Sign-in isn't set up yet.");
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyCode(email: string, token: string) {
  const sb = supabase();
  if (!sb) throw new Error("Sign-in isn't set up yet.");
  const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
}

export async function signOut() {
  await supabase()?.auth.signOut();
}
