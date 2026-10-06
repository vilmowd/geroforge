"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepLine, offerLine, passClip, pickLine, pullLine, settlePass } from "@/app/actions/loops";
import { LINE_LEAD } from "@/lib/digest";
import type { FeedCard } from "@/lib/feed";

export function DigestActions({
  post,
  authenticated,
}: {
  post: FeedCard;
  authenticated: boolean;
}) {
  const router = useRouter();
  const [kept, setKept] = useState(Boolean(post.kept));
  const [passOpen, setPassOpen] = useState(false);
  const [name, setName] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);
  const [line, setLine] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const offers = post.offers ?? [];

  useEffect(() => {
    if (!post.passedBy) return;
    void settlePass();
  }, [post.passedBy, post.id]);
  const login = `/login?next=${encodeURIComponent(`/posts/${post.slug}`)}`;

  if (!authenticated) {
    return (
      <p className="relative z-20 text-xs text-mist">
        <Link href={login} className="font-semibold text-copper underline">
          Sign in
        </Link>{" "}
        to keep a line, pass it, or challenge it.
      </p>
    );
  }

  async function onKeep() {
    setBusy(true);
    const result = await keepLine(post.id);
    setBusy(false);
    if (result.error) {
      setNote(result.error);
      return;
    }
    setKept(Boolean(result.kept));
    setNote(result.kept ? "Kept in your book of lines." : "Removed from your book of lines.");
  }

  async function onPass(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await passClip(post.id, name);
    setBusy(false);
    setNote(result.error || `Passed to ${name.trim()}. It sits on their next visit, then it is gone.`);
    if (result.ok) {
      setName("");
      setPassOpen(false);
    }
  }

  async function onOffer(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await offerLine(post.id, line);
    setBusy(false);
    if (result.error) {
      setNote(result.error);
      return;
    }
    setLine("");
    setOfferOpen(false);
    setNote("Your line is up. It replaces the desk note after 3 picks.");
    router.refresh();
  }

  return (
    <div className="relative z-20 flex flex-col gap-2">
      {post.passedBy ? <p className="text-xs font-semibold text-copper">Passed by {post.passedBy}</p> : null}
      {post.roomLine ? <p className="text-[11px] font-bold uppercase tracking-wide text-copper">Room line</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost min-h-9 px-3 py-1 text-xs" disabled={busy} onClick={() => void onKeep()}>
          {kept ? "Kept" : "Keep this line"}
        </button>
        <button type="button" className="btn-ghost min-h-9 px-3 py-1 text-xs" disabled={busy} onClick={() => setPassOpen((open) => !open)}>
          Pass
        </button>
        <button type="button" className="btn-ghost min-h-9 px-3 py-1 text-xs" disabled={busy} onClick={() => setOfferOpen((open) => !open)}>
          Challenge the line
        </button>
      </div>
      {passOpen ? (
        <form onSubmit={(event) => void onPass(event)} className="flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Their username"
            aria-label="Username to pass this to"
            className="field min-h-9 py-1 text-xs"
            maxLength={32}
          />
          <button type="submit" className="btn min-h-9 px-3 py-1 text-xs" disabled={busy || name.trim().length < 3}>
            Send
          </button>
        </form>
      ) : null}
      {offers.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-2xl bg-[#f6f6f8] px-3 py-2">
              <p className="text-sm leading-5 text-cream">{offer.line}</p>
              <p className="mt-1 text-[11px] text-mist">
                {offer.picks} of {LINE_LEAD} picks
              </p>
              <div className="mt-1 flex gap-2">
                {offer.mine ? (
                  <button type="button" className="text-xs font-semibold text-copper underline" disabled={busy} onClick={() => void run(() => pullLine(offer.id))}>
                    Pull this line
                  </button>
                ) : (
                  <button type="button" className="text-xs font-semibold text-copper underline" disabled={busy || offer.picked} onClick={() => void run(() => pickLine(offer.id))}>
                    {offer.picked ? "Picked" : "Pick this line"}
                  </button>
                )}
                {!offer.mine ? (
                  <button type="button" className="text-xs font-semibold text-mist underline" disabled={busy} onClick={() => void run(() => pullLine(offer.id))}>
                    Not this line
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {offerOpen ? (
        <form onSubmit={(event) => void onOffer(event)} className="flex flex-col gap-2">
          <textarea
            value={line}
            onChange={(event) => setLine(event.target.value)}
            placeholder="One shorter sentence for the same source"
            aria-label="Your line"
            maxLength={160}
            rows={2}
            className="field py-2 text-sm"
          />
          <button type="submit" className="btn w-fit min-h-9 px-3 py-1 text-xs" disabled={busy}>
            Offer this line
          </button>
        </form>
      ) : null}
      {note ? <p className="text-xs text-mist">{note}</p> : null}
    </div>
  );

  async function run(action: () => Promise<{ error: string; ok?: boolean }>) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    setNote(result.error || "Saved.");
    if (result.ok) router.refresh();
  }
}
