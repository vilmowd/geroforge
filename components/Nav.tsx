import Link from "next/link";
import { UserRound } from "lucide-react";
import { Avatar } from "@/components/Avatar";

export function Nav({
  user,
}: {
  user: { name: string | null; email: string; karma: number; avatarUrl: string | null } | null;
}) {
  const username = user?.name || "Account";
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-5">
        <Link href="/" className="inline-flex shrink-0 items-center" aria-label="GeroForge">
          <img src="/logo.png" alt="" width={424} height={269} className="h-9 w-auto rounded-lg" />
        </Link>
        <div className="flex min-w-0 items-center gap-1.5">
          {user ? (
            <Link href="/account" className="inline-flex min-w-0 items-center gap-1.5 rounded-full py-1 pl-2 text-cream">
              <span className="max-w-[7rem] truncate text-xs font-semibold sm:max-w-[12rem]">{username}</span>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-panel2">
                {user.avatarUrl ? (
                  <Avatar name={username} src={user.avatarUrl} className="h-9 w-9 text-xs" />
                ) : (
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-2 py-1 text-xs font-semibold text-cream">
                Log in
              </Link>
              <Link href="/signup" className="rounded-full bg-copper px-3.5 py-1.5 text-xs font-semibold text-white">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
