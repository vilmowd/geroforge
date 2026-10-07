CREATE TYPE "ClipMarkKind" AS ENUM ('INTERESTING', 'UNINTERESTING', 'INFORMATIVE');

CREATE TABLE "ClipMark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "kind" "ClipMarkKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClipMark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClipMark_userId_postId_key" ON "ClipMark"("userId", "postId");

CREATE INDEX "ClipMark_postId_kind_idx" ON "ClipMark"("postId", "kind");

ALTER TABLE "ClipMark" ADD CONSTRAINT "ClipMark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClipMark" ADD CONSTRAINT "ClipMark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "Post"
SET "remixedContent" = jsonb_set("remixedContent"::jsonb, '{format}', '"video"'::jsonb)
WHERE "remixedContent"->>'format' = 'reel'
  AND COALESCE("sourceUrl", '') !~* '/shorts/|tiktok\.com|instagram\.com/reel'
  AND (
    COALESCE("sourceUrl", '') ~* 'youtube\.com/watch|youtu\.be/|vimeo\.com'
    OR COALESCE("embedUrl", '') ~* 'youtube|vimeo'
  );
