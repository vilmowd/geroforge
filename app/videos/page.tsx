import type { Metadata } from "next";
import { ShelfScreen } from "@/components/ShelfScreen";

export const metadata: Metadata = {
  title: "Videos",
  description: "Trending public videos with a short original note and a link back to the source.",
  alternates: { canonical: "/videos" },
};

export default function VideosPage() {
  return <ShelfScreen filter="videos" heading="Videos" />;
}
