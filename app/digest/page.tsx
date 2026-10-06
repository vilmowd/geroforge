import type { Metadata } from "next";
import { CategoryTabs } from "@/components/CategoryTabs";
import { EditionBoard } from "@/components/EditionBoard";

export const metadata: Metadata = {
  title: "Daily digest",
  description: "The morning or evening edition. A lead, a clip, and the wire, with the originals still linked.",
  alternates: { canonical: "/digest" },
};

export default function DigestPage() {
  return (
    <div>
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-3 mb-4 flex items-center px-3 py-1 sm:static sm:mx-0 sm:px-0 sm:py-0">
        <CategoryTabs active="digest" />
      </div>
      <EditionBoard />
    </div>
  );
}
