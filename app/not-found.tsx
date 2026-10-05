import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-copper">404</p>
      <h1 className="mt-2 font-serif text-4xl text-cream">That page is not on the wire</h1>
      <Link href="/" className="btn mt-6">
        Back to the feed
      </Link>
    </section>
  );
}
