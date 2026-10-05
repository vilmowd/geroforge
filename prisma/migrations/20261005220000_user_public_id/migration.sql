ALTER TABLE "User" ADD COLUMN "publicId" TEXT;
UPDATE "User" SET "publicId" = md5("id" || clock_timestamp()::text || random()::text) WHERE "publicId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");
