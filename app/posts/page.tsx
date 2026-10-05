import type { Metadata } from "next";
import { ShelfScreen } from "@/components/ShelfScreen";

export const metadata: Metadata = {
  title: "Posts",
  description: "Fresh public posts with a short original note and a link back to the discussion.",
  alternates: { canonical: "/posts" },
};

export default function PostsLanePage() {
  return <ShelfScreen filter="posts" heading="Posts" />;
}