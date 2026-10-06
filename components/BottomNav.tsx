"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Clapperboard, Globe2, Home, MessagesSquare, Newspaper, ScrollText, SquarePlay, SunMedium } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Home", icon: Home, key: "home" },
  { href: "/digest", label: "Digest", icon: SunMedium, key: "digest" },
  { href: "/videos", label: "Videos", icon: Clapperboard, key: "videos" },
  { href: "/reels", label: "Reels", icon: SquarePlay, key: "reels" },
  { href: "/news", label: "News", icon: Newspaper, key: "news" },
  { href: "/world", label: "World", icon: Globe2, key: "world" },
  { href: "/articles", label: "Articles", icon: ScrollText, key: "articles" },
  { href: "/posts", label: "Posts", icon: MessagesSquare, key: "posts" },
];

export function BottomNav() {
  const pathname = usePathname();
  const filter = useSearchParams().get("filter");

  return (
    <nav className="app-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-10px_30px_rgba(17,17,17,0.08)] backdrop-blur-xl sm:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-8">
        {ITEMS.map((item) => {
          const active = item.key === "home" ? pathname === "/" && !filter : pathname === item.href || (pathname === "/" && filter === item.key);
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold leading-none transition active:scale-90 ${
                  active ? "text-copper" : "text-mist"
                }`}
              >
                <span className={`inline-flex rounded-2xl px-2 py-1 ${active ? "bg-copper/12" : ""}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
