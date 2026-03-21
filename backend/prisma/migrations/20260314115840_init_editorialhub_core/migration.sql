-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_EMAIL_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('BUYER', 'AUTHOR', 'ADMIN', 'ADMIN_02');

-- CreateEnum
CREATE TYPE "AuthorProfileType" AS ENUM ('CERTIFIED', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "AuthorApplicationStatus" AS ENUM ('IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('BOOK', 'MAGAZINE', 'ARTICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DownloadKeyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'EXHAUSTED', 'REVOKED', 'USED');

-- CreateEnum
CREATE TYPE "PayoutRequestStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('USER_REGISTER_STARTED', 'USER_EMAIL_VERIFIED', 'USER_LOGIN', 'USER_PASSWORD_RECOVERY_REQUESTED', 'USER_PASSWORD_RESET', 'AUTHOR_APPLICATION_CREATED', 'AUTHOR_APPLICATION_APPROVED', 'AUTHOR_APPLICATION_REJECTED', 'WORK_CREATED', 'WORK_UPDATED', 'WORK_SUBMITTED_FOR_REVIEW', 'WORK_APPROVED', 'WORK_REJECTED', 'WORK_PUBLISHED', 'WORK_CANCELLED', 'PURCHASE_CREATED', 'PAYMENT_ATTEMPT_CREATED', 'PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'DOWNLOAD_KEY_GENERATED', 'DOWNLOAD_KEY_REGENERATED', 'DOWNLOAD_ATTEMPT', 'PAYOUT_REQUEST_CREATED', 'PAYOUT_REQUEST_SCHEDULED', 'PAYOUT_REQUEST_PAID', 'ADMIN_ACTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptsUsed" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptsUsed" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicName" TEXT NOT NULL,
    "legalName" TEXT,
    "bio" TEXT,
    "authorProfileType" "AuthorProfileType" NOT NULL,
    "applicationStatus" "AuthorApplicationStatus" NOT NULL DEFAULT 'IN_REVIEW',
    "royaltyRatePercent" DECIMAL(5,2) NOT NULL,
    "taxId" TEXT,
    "payoutMethod" TEXT,
    "payoutAccountData" JSONB,
    "governmentIdFileId" TEXT,
    "avatarFileId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "authorProfileId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "publicationType" "PublicationType" NOT NULL DEFAULT 'BOOK',
    "status" "WorkStatus" NOT NULL DEFAULT 'DRAFT',
    "currentEdition" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "coverFileId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkEdition" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "editionNumber" INTEGER NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "descriptionSnapshot" TEXT,
    "manuscriptFileId" TEXT NOT NULL,
    "coverFileId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "bucket" TEXT,
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksum" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "subtotalAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "confirmedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "workEditionId" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "authorNameSnapshot" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "royaltyRatePercent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerReference" TEXT,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "rawRequest" JSONB,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadKey" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "DownloadKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "attemptsUsed" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "generatedByUserId" TEXT,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DownloadKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadAttempt" (
    "id" TEXT NOT NULL,
    "downloadKeyId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "wasSuccessful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL,
    "authorProfileId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "status" "PayoutRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "eventType" "AuditEventType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "workId" TEXT,
    "purchaseId" TEXT,
    "payoutRequestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_userId_idx" ON "EmailVerificationCode"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_expiresAt_idx" ON "EmailVerificationCode"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetCode_userId_idx" ON "PasswordResetCode"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetCode_expiresAt_idx" ON "PasswordResetCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorProfile_userId_key" ON "AuthorProfile"("userId");

-- CreateIndex
CREATE INDEX "AuthorProfile_applicationStatus_idx" ON "AuthorProfile"("applicationStatus");

-- CreateIndex
CREATE INDEX "AuthorProfile_publicName_idx" ON "AuthorProfile"("publicName");

-- CreateIndex
CREATE UNIQUE INDEX "Work_slug_key" ON "Work"("slug");

-- CreateIndex
CREATE INDEX "Work_authorProfileId_idx" ON "Work"("authorProfileId");

-- CreateIndex
CREATE INDEX "Work_status_idx" ON "Work"("status");

-- CreateIndex
CREATE INDEX "Work_title_idx" ON "Work"("title");

-- CreateIndex
CREATE INDEX "WorkEdition_workId_isActive_idx" ON "WorkEdition"("workId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WorkEdition_workId_editionNumber_key" ON "WorkEdition"("workId", "editionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_objectKey_key" ON "FileAsset"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_folio_key" ON "Purchase"("folio");

-- CreateIndex
CREATE INDEX "Purchase_buyerId_idx" ON "Purchase"("buyerId");

-- CreateIndex
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- CreateIndex
CREATE INDEX "Purchase_createdAt_idx" ON "Purchase"("createdAt");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_workId_idx" ON "PurchaseItem"("workId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_purchaseId_idx" ON "PaymentAttempt"("purchaseId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_buyerId_idx" ON "PaymentAttempt"("buyerId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_status_idx" ON "PaymentAttempt"("status");

-- CreateIndex
CREATE INDEX "PaymentAttempt_providerReference_idx" ON "PaymentAttempt"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "DownloadKey_code_key" ON "DownloadKey"("code");

-- CreateIndex
CREATE INDEX "DownloadKey_purchaseId_idx" ON "DownloadKey"("purchaseId");

-- CreateIndex
CREATE INDEX "DownloadKey_buyerId_idx" ON "DownloadKey"("buyerId");

-- CreateIndex
CREATE INDEX "DownloadKey_status_idx" ON "DownloadKey"("status");

-- CreateIndex
CREATE INDEX "DownloadKey_expiresAt_idx" ON "DownloadKey"("expiresAt");

-- CreateIndex
CREATE INDEX "DownloadAttempt_downloadKeyId_idx" ON "DownloadAttempt"("downloadKeyId");

-- CreateIndex
CREATE INDEX "DownloadAttempt_createdAt_idx" ON "DownloadAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "PayoutRequest_authorProfileId_idx" ON "PayoutRequest"("authorProfileId");

-- CreateIndex
CREATE INDEX "PayoutRequest_requestedByUserId_idx" ON "PayoutRequest"("requestedByUserId");

-- CreateIndex
CREATE INDEX "PayoutRequest_status_idx" ON "PayoutRequest"("status");

-- CreateIndex
CREATE INDEX "PayoutRequest_scheduledFor_idx" ON "PayoutRequest"("scheduledFor");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_eventType_idx" ON "AuditLog"("eventType");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_targetUserId_idx" ON "AuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "AuditLog_workId_idx" ON "AuditLog"("workId");

-- CreateIndex
CREATE INDEX "AuditLog_purchaseId_idx" ON "AuditLog"("purchaseId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationCode" ADD CONSTRAINT "EmailVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetCode" ADD CONSTRAINT "PasswordResetCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorProfile" ADD CONSTRAINT "AuthorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_authorProfileId_fkey" FOREIGN KEY ("authorProfileId") REFERENCES "AuthorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkEdition" ADD CONSTRAINT "WorkEdition_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_workEditionId_fkey" FOREIGN KEY ("workEditionId") REFERENCES "WorkEdition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadKey" ADD CONSTRAINT "DownloadKey_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadKey" ADD CONSTRAINT "DownloadKey_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadAttempt" ADD CONSTRAINT "DownloadAttempt_downloadKeyId_fkey" FOREIGN KEY ("downloadKeyId") REFERENCES "DownloadKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_authorProfileId_fkey" FOREIGN KEY ("authorProfileId") REFERENCES "AuthorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
