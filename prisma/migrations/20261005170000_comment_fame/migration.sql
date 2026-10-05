ALTER TABLE "Comment" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CommentLike" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommentLike_userId_commentId_key" ON "CommentLike"("userId", "commentId");
CREATE INDEX "CommentLike_commentId_idx" ON "CommentLike"("commentId");

ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "User" SET "karma" = 0;
UPDATE "User" AS u SET "karma" = (
  SELECT COUNT(*)::int
  FROM "Comment" AS reply
  INNER JOIN "Comment" AS parent ON reply."parentId" = parent."id"
  WHERE parent."userId" = u."id" AND reply."userId" <> parent."userId"
);
