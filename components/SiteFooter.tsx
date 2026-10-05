import Link from "next/link";
import { AccessibilityWidget } from "@/components/AccessibilityWidget";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-6 flex max-w-6xl items-center justify-center gap-x-4 px-3 pb-2 text-xs font-semibold text-mist">
      <AccessibilityWidget />
      <Link href="/privacy" className="rounded-full px-1 py-1 hover:text-cream">
        Privacy
      </Link>
      <Link href="/terms" className="rounded-full px-1 py-1 hover:text-cream">
        Terms
      </Link>
    </footer>
  );
}
