ALTER TABLE "User" ADD COLUMN "nameHash" TEXT;

CREATE UNIQUE INDEX "User_nameHash_key" ON "User"("nameHash");

CREATE TABLE "ExitVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "worth" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExitVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KeptLine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KeptLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClipPass" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClipPass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LineOffer" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "picks" INTEGER NOT NULL DEFAULT 0,
    "flags" INTEGER NOT NULL DEFAULT 0,
    "pulled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LineOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LinePick" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LinePick_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DoorPick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "otherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DoorPick_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExitVote_userId_postId_key" ON "ExitVote"("userId", "postId");
CREATE INDEX "ExitVote_userId_createdAt_idx" ON "ExitVote"("userId", "createdAt");
CREATE UNIQUE INDEX "KeptLine_userId_postId_key" ON "KeptLine"("userId", "postId");
CREATE INDEX "KeptLine_userId_createdAt_idx" ON "KeptLine"("userId", "createdAt");
CREATE INDEX "ClipPass_toUserId_seenAt_idx" ON "ClipPass"("toUserId", "seenAt");
CREATE INDEX "LineOffer_postId_pulled_picks_idx" ON "LineOffer"("postId", "pulled", "picks");
CREATE INDEX "LineOffer_userId_idx" ON "LineOffer"("userId");
CREATE UNIQUE INDEX "LinePick_offerId_userId_key" ON "LinePick"("offerId", "userId");
CREATE UNIQUE INDEX "DoorPick_userId_postId_otherId_key" ON "DoorPick"("userId", "postId", "otherId");
CREATE INDEX "DoorPick_userId_createdAt_idx" ON "DoorPick"("userId", "createdAt");

ALTER TABLE "ExitVote" ADD CONSTRAINT "ExitVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExitVote" ADD CONSTRAINT "ExitVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KeptLine" ADD CONSTRAINT "KeptLine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KeptLine" ADD CONSTRAINT "KeptLine_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClipPass" ADD CONSTRAINT "ClipPass_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClipPass" ADD CONSTRAINT "ClipPass_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClipPass" ADD CONSTRAINT "ClipPass_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LineOffer" ADD CONSTRAINT "LineOffer_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LineOffer" ADD CONSTRAINT "LineOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LinePick" ADD CONSTRAINT "LinePick_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "LineOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LinePick" ADD CONSTRAINT "LinePick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoorPick" ADD CONSTRAINT "DoorPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoorPick" ADD CONSTRAINT "DoorPick_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoorPick" ADD CONSTRAINT "DoorPick_otherId_fkey" FOREIGN KEY ("otherId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
