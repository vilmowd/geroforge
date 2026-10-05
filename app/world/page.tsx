import type { Metadata } from "next";
import { ShelfScreen } from "@/components/ShelfScreen";

export const metadata: Metadata = {
  title: "World",
  description: "Fresh public world stories with a short original note and a link back to the source.",
  alternates: { canonical: "/world" },
};

export default function WorldPage() {
  return <ShelfScreen filter="world" heading="World" />;
}
