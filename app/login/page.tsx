import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { safeNextPath } from "@/lib/format";

export const metadata = { title: "Log in", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-3xl font-extrabold tracking-tight text-cream">Log in</h1>
      {params.error === "expired" ? (
        <p className="mt-4 rounded-2xl border border-line bg-[#f3f4f6] px-3 py-3 text-sm text-cream">That link is no longer valid.</p>
      ) : null}
      <LoginForm nextPath={nextPath} />
      <p className="mt-6 text-xs leading-5 text-mist">
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="underline">
          Terms
        </Link>
      </p>
    </section>
  );
}
