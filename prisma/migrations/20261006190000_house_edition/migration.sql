-- CreateTable
CREATE TABLE "DeskFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "desk" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeskFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Correction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "pulled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Correction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeskFollow_userId_desk_key" ON "DeskFollow"("userId", "desk");

-- CreateIndex
CREATE INDEX "DeskFollow_userId_idx" ON "DeskFollow"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceFollow_userId_sourceName_key" ON "SourceFollow"("userId", "sourceName");

-- CreateIndex
CREATE INDEX "SourceFollow_userId_idx" ON "SourceFollow"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Correction_userId_postId_key" ON "Correction"("userId", "postId");

-- CreateIndex
CREATE INDEX "Correction_pulled_createdAt_idx" ON "Correction"("pulled", "createdAt");

-- AddForeignKey
ALTER TABLE "DeskFollow" ADD CONSTRAINT "DeskFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceFollow" ADD CONSTRAINT "SourceFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
