CREATE INDEX "Post_commentCount_idx" ON "Post"("commentCount");

UPDATE "Post" SET "category" = 'Sports'
WHERE "sourceName" IN ('YouTube Shorts / NBA', 'YouTube Shorts / FORMULA 1', 'YouTube Shorts / Red Bull');

UPDATE "Post" SET "category" = 'Space'
WHERE "sourceName" = 'YouTube / NASA';

UPDATE "Post" SET "category" = 'Culture'
WHERE "sourceName" IN ('Vimeo / Staff Picks', 'YouTube Shorts / Great Big Story', 'YouTube Shorts / Jazza');
