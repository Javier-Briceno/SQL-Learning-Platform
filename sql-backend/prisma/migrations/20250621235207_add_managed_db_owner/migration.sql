-- AlterTable
ALTER TABLE "ManagedDatabase" ADD COLUMN     "ownerId" INTEGER;

-- AddForeignKey
ALTER TABLE "ManagedDatabase" ADD CONSTRAINT "ManagedDatabase_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
