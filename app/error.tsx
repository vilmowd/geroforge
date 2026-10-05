"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl py-10">
      <h1 className="font-serif text-4xl text-cream">The wire stumbled</h1>
      <p className="mt-3 text-sm leading-6 text-mist">
        This page could not be loaded. The worker keeps running, and you can try the request again.
      </p>
      <button className="btn mt-6" type="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
