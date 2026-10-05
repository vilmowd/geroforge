"use client";

import { useActionState } from "react";
import Link from "next/link";
import { changePasswordAction, type PasswordState } from "@/app/actions/auth";

const start: PasswordState = { error: "", ok: "" };

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, start);

  return (
    <section className="mx-auto max-w-md">
      <Link href="/account" className="text-sm font-semibold text-copper">
        Back to account
      </Link>
      <div className="mt-3 overflow-hidden rounded-[28px] bg-white shadow-card">
        <h1 className="border-b border-black/5 px-5 py-4 text-lg font-extrabold text-cream">Change password</h1>
        {hasPassword ? (
          <form action={action} className="space-y-3 px-5 py-4">
            <label className="block text-xs font-semibold text-mist">
              Current password
              <input className="field mt-1.5" type="password" name="current" autoComplete="current-password" required />
            </label>
            <label className="block text-xs font-semibold text-mist">
              New password
              <input className="field mt-1.5" type="password" name="nextPassword" autoComplete="new-password" minLength={8} required />
            </label>
            <label className="block text-xs font-semibold text-mist">
              Confirm new password
              <input className="field mt-1.5" type="password" name="confirmPassword" autoComplete="new-password" minLength={8} required />
            </label>
            {state.error ? <p className="text-sm text-copper">{state.error}</p> : null}
            {state.ok ? <p className="text-sm font-semibold text-cream">{state.ok}</p> : null}
            <button className="btn w-full" type="submit" disabled={pending}>
              {pending ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : (
          <p className="px-5 py-4 text-sm text-mist">This account signs in with an email link, so there is no password to change.</p>
        )}
      </div>
    </section>
  );
}
