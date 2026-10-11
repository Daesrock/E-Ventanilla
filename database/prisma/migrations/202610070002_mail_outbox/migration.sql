-- CreateTable
CREATE TABLE "MailJob" (
    "id" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailJob_challengeId_key" ON "MailJob"("challengeId");

-- CreateIndex
CREATE INDEX "MailJob_availableAt_idx" ON "MailJob"("availableAt");

-- AddForeignKey
ALTER TABLE "MailJob" ADD CONSTRAINT "MailJob_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "AuthChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
