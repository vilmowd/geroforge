"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { logInAction, type AccountState } from "@/app/actions/auth";

const initial: AccountState = { error: "" };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(logInAction, initial);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!state.hold) return;
    setHeld(true);
    const timer = window.setTimeout(() => setHeld(false), 5000);
    return () => window.clearTimeout(timer);
  }, [state.hold]);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block text-sm text-mist">
        Email
        <input className="field mt-2" type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
      </label>
      <label className="block text-sm text-mist">
        Password
        <input className="field mt-2" type="password" name="password" required autoComplete="current-password" minLength={8} />
      </label>
      {state.error ? <p className="text-sm text-copper">{state.error}</p> : null}
      <button className="btn w-full" type="submit" disabled={pending || held}>
        {pending ? "Signing in…" : "Log in"}
      </button>
      <p className="text-sm text-mist">
        New here?{" "}
        <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-copper">
          Create an account
        </Link>
      </p>
    </form>
  );
}
