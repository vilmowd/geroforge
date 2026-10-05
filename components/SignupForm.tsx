"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AccountState } from "@/app/actions/auth";

const initial: AccountState = { error: "" };

export function SignupForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(signUpAction, initial);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="block text-sm text-mist">
        Email
        <input className="field mt-2" type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
      </label>
      <label className="block text-sm text-mist">
        Password
        <input className="field mt-2" type="password" name="password" required autoComplete="new-password" minLength={8} />
      </label>
      <label className="block text-sm text-mist">
        Confirm password
        <input className="field mt-2" type="password" name="confirm" required autoComplete="new-password" minLength={8} />
      </label>
      <label className="flex items-start gap-2 text-sm text-mist">
        <input className="mt-1" type="checkbox" name="agree" required />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="font-semibold text-copper">
            terms of service
          </Link>{" "}
          and the{" "}
          <Link href="/privacy" className="font-semibold text-copper">
            privacy policy
          </Link>
          .
        </span>
      </label>
      {state.error ? <p className="text-sm text-copper">{state.error}</p> : null}
      <button className="btn w-full" type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-sm text-mist">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-copper">
          Log in
        </Link>
      </p>
    </form>
  );
}
