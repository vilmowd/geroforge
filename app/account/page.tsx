import Link from "next/link";
import { AccountPanel } from "@/components/AccountPanel";
import { getCurrentUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { linesForUser } from "@/lib/loops";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <section className="mx-auto max-w-md rounded-[28px] bg-white px-6 py-10 text-center shadow-card">
        <h1 className="text-3xl font-extrabold tracking-tight text-cream">Account</h1>
        <p className="mt-2 text-sm leading-6 text-mist">Log in to see your username, picture, and activity.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login?next=/account" className="btn">
            Log in
          </Link>
          <Link href="/signup?next=/account" className="btn-ghost">
            Sign up
          </Link>
        </div>
      </section>
    );
  }

  const [commentCount, likeCount, recent, lines] = await Promise.all([
    prisma.comment.count({ where: { userId: user.id } }),
    prisma.vote.count({ where: { userId: user.id } }),
    prisma.comment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, content: true, createdAt: true, post: { select: { title: true, publicId: true } } },
    }),
    linesForUser(user.id),
  ]);

  return (
    <>
    <AccountPanel
      name={user.name || "Reader"}
      email={user.email}
      avatarUrl={user.avatarUrl}
      bio={user.bio || ""}
      joined={new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(user.createdAt)}
      karma={user.karma}
      comments={commentCount}
      likes={likeCount}
      recent={recent.map((comment) => ({
        id: comment.id,
        excerpt: comment.content.replace(/\s+/g, " ").trim().slice(0, 140),
        when: timeAgo(comment.createdAt),
        title: comment.post.title,
        slug: comment.post.publicId,
      }))}
    />
    {lines.length > 0 ? (
      <section className="mx-auto mt-3 max-w-lg rounded-[28px] bg-white px-5 py-5 shadow-card">
        <h2 className="text-sm font-extrabold tracking-tight text-cream">Book of lines</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {lines.map((item) => (
            <li key={item.id}>
              <p className="text-sm leading-6 text-cream">{item.line}</p>
              <p className="mt-1 text-xs text-mist">
                {item.sourceName}
                {item.sourceUrl ? (
                  <>
                    <span aria-hidden="true"> · </span>
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-copper underline">
                      Original
                    </a>
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      </section>
    ) : null}
    </>
  );
}
