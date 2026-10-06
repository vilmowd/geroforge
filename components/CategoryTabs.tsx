import Link from "next/link";
const TABS: { id: string; label: string; href: string }[] = [
  { id: "all", label: "All", href: "/" },
  { id: "digest", label: "Daily digest", href: "/digest" },
  { id: "videos", label: "Videos", href: "/videos" },
  { id: "reels", label: "Reels", href: "/reels" },
  { id: "news", label: "News", href: "/news" },
  { id: "world", label: "World", href: "/world" },
  { id: "articles", label: "Articles", href: "/articles" },
  { id: "posts", label: "Posts", href: "/posts" },
];

export function CategoryTabs({ active }: { active: string | null }) {
  return (
    <div className="app-chips hidden min-w-0 flex-1 snap-x gap-2 overflow-x-auto [scrollbar-width:none] sm:flex sm:gap-1.5">
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={`snap-start whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition duration-200 active:scale-95 sm:px-3 sm:py-1.5 sm:text-xs sm:hover:-translate-y-0.5 ${
              selected ? "bg-copper text-white shadow-sm" : "bg-white text-cream shadow-sm sm:bg-[#f3f4f6] sm:shadow-none"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
