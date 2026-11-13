-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "isRevoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "revokedAt" TIMESTAMP(3);

