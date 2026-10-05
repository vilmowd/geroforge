import type { Metadata } from "next";
import { ShelfScreen } from "@/components/ShelfScreen";

export const metadata: Metadata = {
  title: "Articles",
  description: "Fresh public articles with a short original note and a link back to the source.",
  alternates: { canonical: "/articles" },
};

export default function ArticlesPage() {
  return <ShelfScreen filter="articles" heading="Articles" />;
}
