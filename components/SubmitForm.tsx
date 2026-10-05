"use client";

import { useActionState } from "react";
import { submitLink, type SubmitState } from "@/app/actions/submit";

const initial: SubmitState = { error: "" };

export function SubmitForm() {
  const [state, action, pending] = useActionState(submitLink, initial);

  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm text-mist">
        Article or video URL
        <input
          className="field mt-2"
          type="url"
          name="url"
          required
          placeholder="https://"
        />
      </label>
      {state.error ? <p className="text-sm text-copper">{state.error}</p> : null}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Processing…" : "Publish to the wire"}
      </button>
    </form>
  );
}
