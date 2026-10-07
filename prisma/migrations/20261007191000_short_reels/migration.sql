UPDATE "Post"
SET "remixedContent" = jsonb_set("remixedContent"::jsonb, '{format}', '"reel"'::jsonb)
WHERE "contentType" = 'VIDEO_EMBED'
  AND (
    "sourceName" ILIKE 'YouTube Shorts%'
    OR COALESCE("sourceUrl", '') ~* '/shorts/|tiktok\.com|instagram\.com/reel'
    OR COALESCE("embedUrl", '') ~* 'tiktok\.com|instagram\.com/reel'
  );
