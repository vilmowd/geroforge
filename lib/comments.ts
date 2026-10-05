export type CommentNode = {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorRef: string | null;
  karma: number;
  likeCount: number;
  liked: boolean;
  replies: CommentNode[];
};

type FlatComment = {
  id: string;
  content: string;
  createdAt: Date;
  parentId: string | null;
  likeCount: number;
  likes?: { id: string }[];
  user: { name: string | null; karma: number; publicId?: string | null };
};

export function buildCommentTree(rows: FlatComment[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();
  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      authorName: row.user.name || "Reader",
      authorRef: row.user.publicId && /^[a-f0-9]{32}$/i.test(row.user.publicId) ? row.user.publicId : null,
      karma: row.user.karma,
      likeCount: row.likeCount,
      liked: Boolean(row.likes?.length),
      replies: [],
    });
  }

  const roots: CommentNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id);
    if (!node) continue;
    if (row.parentId && nodes.has(row.parentId)) {
      nodes.get(row.parentId)?.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
