import { SignupForm } from "@/components/SignupForm";
import { safeNextPath } from "@/lib/format";

export const metadata = { title: "Sign up", robots: { index: false, follow: false } };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next ? safeNextPath(params.next) : "/account";

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-3xl font-extrabold tracking-tight text-cream">Create your account</h1>
      <SignupForm nextPath={nextPath} />
    </section>
  );
}
