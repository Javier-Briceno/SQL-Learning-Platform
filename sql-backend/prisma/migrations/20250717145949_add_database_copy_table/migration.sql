-- CreateTable
CREATE TABLE "DatabaseCopy" (
    "id" SERIAL NOT NULL,
    "originalDatabase" TEXT NOT NULL,
    "copyDatabase" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseCopy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseCopy_copyDatabase_key" ON "DatabaseCopy"("copyDatabase");
