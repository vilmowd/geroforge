DROP INDEX IF EXISTS "Post_category_idx";
DROP INDEX IF EXISTS "Post_contentType_idx";

CREATE INDEX IF NOT EXISTS "Post_category_createdAt_idx" ON "Post"("category", "createdAt");
CREATE INDEX IF NOT EXISTS "Post_contentType_createdAt_idx" ON "Post"("contentType", "createdAt");
