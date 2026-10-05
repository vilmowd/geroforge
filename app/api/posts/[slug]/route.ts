import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPostDetail } from "@/lib/feed";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const user = await getCurrentUser();
  const post = await getPostDetail(slug, user?.id);
  if (!post) return NextResponse.json({ error: "Missing post" }, { status: 404 });
  return NextResponse.json({ comments: post.comments, upvotesCount: post.upvotesCount, voted: post.voted });
}
