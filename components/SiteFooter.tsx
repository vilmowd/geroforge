import Link from "next/link";
import { AccessibilityWidget } from "@/components/AccessibilityWidget";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto mt-8 flex w-full max-w-6xl flex-col items-center gap-2 px-3 pb-4 text-xs font-semibold text-mist">
      <div className="flex items-center justify-center gap-x-4">
        <AccessibilityWidget />
        <Link href="/privacy" className="rounded-full px-1 py-1 hover:text-cream">
          Privacy
        </Link>
        <Link href="/terms" className="rounded-full px-1 py-1 hover:text-cream">
          Terms
        </Link>
      </div>
      <p>All rights reserved GeroForge {year}</p>
    </footer>
  );
}
