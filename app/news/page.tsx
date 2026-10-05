import type { Metadata } from "next";
import { ShelfScreen } from "@/components/ShelfScreen";

export const metadata: Metadata = {
  title: "News",
  description: "Fresh public news with a short original desk note and a link back to the report.",
  alternates: { canonical: "/news" },
};

export default function NewsPage() {
  return <ShelfScreen filter="news" heading="News" />;
}
