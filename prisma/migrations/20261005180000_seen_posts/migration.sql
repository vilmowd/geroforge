CREATE TABLE "SeenPost" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeenPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeenPost_userId_postId_key" ON "SeenPost"("userId", "postId");
CREATE INDEX "SeenPost_userId_seenAt_idx" ON "SeenPost"("userId", "seenAt");

ALTER TABLE "SeenPost" ADD CONSTRAINT "SeenPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeenPost" ADD CONSTRAINT "SeenPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
