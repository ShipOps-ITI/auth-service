CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PREMIUM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PENDING', 'PAST_DUE', 'CANCELED');

ALTER TABLE "User"
  ADD COLUMN "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "paymobSubscriptionId" TEXT,
  ADD COLUMN "paymobIntentionId" TEXT,
  ADD COLUMN "paymobPlanId" INTEGER,
  ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_paymobSubscriptionId_key" ON "User"("paymobSubscriptionId");
CREATE UNIQUE INDEX "User_paymobIntentionId_key" ON "User"("paymobIntentionId");
