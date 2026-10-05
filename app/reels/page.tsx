import type { Metadata } from "next";
import { ShelfScreen } from "@/components/ShelfScreen";

export const metadata: Metadata = {
  title: "Reels",
  description: "Short public reels with a short original note and a link back to the source.",
  alternates: { canonical: "/reels" },
};

export default function ReelsPage() {
  return <ShelfScreen filter="reels" heading="Reels" />;
}
