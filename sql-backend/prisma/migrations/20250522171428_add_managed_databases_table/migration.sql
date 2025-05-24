-- CreateTable
CREATE TABLE "ManagedDatabase" (
    "id" SERIAL NOT NULL,
    "dbName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedDatabase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagedDatabase_dbName_key" ON "ManagedDatabase"("dbName");
