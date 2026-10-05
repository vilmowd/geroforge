"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ChevronRight, Heart, LogOut, MessageCircle, Settings, Sparkles } from "lucide-react";
import { signOutAction, updateAvatarAction, updateBioAction } from "@/app/actions/auth";
import { Avatar } from "@/components/Avatar";

export type AccountComment = {
  id: string;
  excerpt: string;
  when: string;
  title: string;
  slug: string;
};

export function AccountPanel({
  name,
  email,
  avatarUrl,
  bio,
  joined,
  karma,
  comments,
  likes,
  recent,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  joined: string;
  karma: number;
  comments: number;
  likes: number;
  recent: AccountComment[];
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a photo.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const picture = await shrinkPhoto(file);
      const data = new FormData();
      data.set("avatar", picture);
      const result = await updateAvatarAction(data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPreview(picture);
      router.refresh();
    } catch {
      setError("That photo could not be saved. Try a smaller one.");
    } finally {
      setPending(false);
    }
  }

  async function clearPhoto() {
    setPending(true);
    setError("");
    try {
      const data = new FormData();
      data.set("avatar", "clear");
      const result = await updateAvatarAction(data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPreview(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto max-w-lg">
      <div className="overflow-hidden rounded-[28px] bg-white shadow-card">
        <div className="h-24 bg-gradient-to-br from-[#6d4dff] via-[#8a6cff] to-[#f0b429]" />
        <div className="px-5 pb-5">
          <div className="-mt-12 flex items-end justify-between gap-3">
            <div className="relative">
              <Avatar name={name} src={preview} className="h-24 w-24 border-4 border-white text-3xl shadow-card" />
              <label className="absolute bottom-1 right-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-cream text-white shadow">
                <Camera className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{pending ? "Saving picture" : "Change picture"}</span>
                <input className="sr-only" type="file" accept="image/*" disabled={pending} onChange={(event) => void onFile(event.target.files?.[0])} />
              </label>
            </div>
            <p className="mb-2 text-xs font-semibold text-mist">Joined {joined}</p>
          </div>
          <h1 className="mt-3 truncate text-2xl font-extrabold tracking-tight text-cream">{name}</h1>
          <p className="truncate text-sm text-mist">{email}</p>
          {error ? <p className="mt-2 text-sm text-copper">{error}</p> : null}
          {preview ? (
            <button type="button" className="mt-2 text-xs font-semibold text-copper underline" onClick={() => void clearPhoto()} disabled={pending}>
              Use the default picture
            </button>
          ) : null}
        </div>
      </div>

      <AboutYou initial={bio} />

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Stat icon={Sparkles} label="Fame" value={karma} />
        <Stat icon={MessageCircle} label="Comments" value={comments} />
        <Stat icon={Heart} label="Likes" value={likes} />
      </dl>

      <div className="mt-3 overflow-hidden rounded-[28px] bg-white shadow-card">
        <div className="flex items-center gap-2 border-b border-black/5 px-5 py-3">
          <Settings className="h-4 w-4 text-copper" aria-hidden="true" />
          <h2 className="text-sm font-extrabold text-cream">Settings</h2>
        </div>
        <Link href="/account/password" className="flex min-h-12 items-center justify-between px-5 text-sm font-bold text-cream">
          Change password
          <ChevronRight className="h-4 w-4 text-mist" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-3 overflow-hidden rounded-[28px] bg-white shadow-card">
        <h2 className="border-b border-black/5 px-5 py-3 text-sm font-extrabold text-cream">Recent comments</h2>
        {recent.length === 0 ? (
          <p className="px-5 py-4 text-sm text-mist">Comments you write on posts will show up here.</p>
        ) : (
          <ul>
            {recent.map((comment) => (
              <li key={comment.id} className="border-b border-black/5 px-5 py-3 last:border-b-0">
                <Link href={`/posts/${comment.slug}`} className="line-clamp-1 text-sm font-bold text-cream">
                  {comment.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-mist">{comment.excerpt}</p>
                <p className="mt-1 text-[11px] font-semibold text-mist">{comment.when}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={signOutAction} className="mt-3">
        <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[28px] bg-white text-sm font-bold text-copper shadow-card" type="submit">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </form>
    </section>
  );
}

const BIO_LIMIT = 280;

function AboutYou({ initial }: { initial: string }) {
  const router = useRouter();
  const [bio, setBio] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const count = [...bio].length;

  function onChange(value: string) {
    const chars = [...value];
    setBio(chars.length > BIO_LIMIT ? chars.slice(0, BIO_LIMIT).join("") : value);
    setNote("");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNote("");
    try {
      const data = new FormData();
      data.set("bio", bio);
      const result = await updateBioAction(data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(bio.trim());
      setBio(bio.trim());
      setNote("Saved. Other people see this on your profile.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void save(event)} className="mt-3 overflow-hidden rounded-[28px] bg-white shadow-card">
      <h2 className="border-b border-black/5 px-5 py-3 text-sm font-extrabold text-cream">About you</h2>
      <div className="px-5 py-4">
        <label htmlFor="about-you" className="sr-only">
          Write a little bit about yourself
        </label>
        <textarea
          id="about-you"
          name="bio"
          rows={4}
          value={bio}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Write a little bit about yourself"
          className="field min-h-28 resize-none text-sm leading-6"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-mist">{count} / {BIO_LIMIT}</p>
          <button type="submit" className="btn min-h-9 px-4 py-1.5" disabled={pending || bio.trim() === saved.trim()}>
            {pending ? "Saving" : "Save"}
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-copper">{error}</p> : null}
        {note ? <p className="mt-2 text-sm text-mist">{note}</p> : null}
      </div>
    </form>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: number }) {
  return (
    <div className="rounded-[22px] bg-white px-2 py-3 text-center shadow-card">
      <Icon className="mx-auto h-4 w-4 text-copper" aria-hidden="true" />
      <dd className="mt-1 text-lg font-extrabold tabular-nums text-cream">{value}</dd>
      <dt className="text-[11px] font-semibold text-mist">{label}</dt>
    </div>
  );
}

async function shrinkPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
