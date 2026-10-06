import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Heart, MessageCircle, Newspaper } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { publicProfile } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await publicProfile(id);
  if (!profile) notFound();

  return (
    <section className="mx-auto max-w-lg">
      <div className="overflow-hidden rounded-[28px] bg-white shadow-card">
        <div className="h-24 bg-gradient-to-br from-[#6d4dff] via-[#8a6cff] to-[#f0b429]" />
        <div className="px-5 pb-6">
          <Avatar name={profile.name} src={profile.avatarUrl} className="-mt-12 h-24 w-24 border-4 border-white text-3xl shadow-card" />
          <h1 className="mt-3 truncate text-2xl font-extrabold tracking-tight text-cream">{profile.name}</h1>
          {profile.bio ? <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-cream">{profile.bio}</p> : null}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Stat icon={Newspaper} label="Posts" value={profile.posts} />
        <Stat icon={Heart} label="Likes" value={profile.likes} />
        <Stat icon={MessageCircle} label="Comments" value={profile.comments} />
      </dl>
      <LineBook lines={profile.lines} />
    </section>
  );
}

function LineBook({ lines }: { lines: { id: string; line: string; sourceName: string; sourceUrl: string | null; slug: string }[] }) {
  if (lines.length === 0) return null;
  return (
    <section className="mt-3 rounded-[28px] bg-white px-5 py-5 shadow-card">
      <h2 className="text-sm font-extrabold tracking-tight text-cream">Book of lines</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {lines.map((item) => (
          <li key={item.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
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
              <span aria-hidden="true"> · </span>
              <a href={`/posts/${item.slug}`} className="font-semibold text-copper underline">
                On the shelf
              </a>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Newspaper;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[22px] bg-white px-3 py-4 text-center shadow-card">
      <Icon className="mx-auto h-4 w-4 text-copper" aria-hidden="true" />
      <dt className="mt-2 text-[11px] font-bold uppercase tracking-wide text-mist">{label}</dt>
      <dd className="mt-1 text-xl font-extrabold tabular-nums text-cream">{value}</dd>
    </div>
  );
}
