-- CreateEnum
CREATE TYPE "LoyaltyLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- AlterTable
ALTER TABLE "AuthorProfile"
ADD COLUMN "loyaltyManualLevel" "LoyaltyLevel",
ADD COLUMN "loyaltyAssignedAt" TIMESTAMP(3),
ADD COLUMN "loyaltyAssignedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "AuthorProfile_loyaltyManualLevel_idx" ON "AuthorProfile"("loyaltyManualLevel");
