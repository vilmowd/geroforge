ALTER TABLE "User" ADD COLUMN "emailHash" TEXT;
CREATE UNIQUE INDEX "User_emailHash_key" ON "User"("emailHash");

ALTER TABLE "Post" ADD COLUMN "publicId" TEXT;
UPDATE "Post" SET "publicId" = md5("id" || clock_timestamp()::text || random()::text) WHERE "publicId" IS NULL;
ALTER TABLE "Post" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "Post_publicId_key" ON "Post"("publicId");
