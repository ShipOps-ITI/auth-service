ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COMPANY_ADMIN';

CREATE TYPE "MembershipRole" AS ENUM ('COMPANY_ADMIN', 'FLEET_MANAGER', 'CUSTOMER');
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

CREATE TABLE "company_memberships" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "companyId" INTEGER NOT NULL,
  "role" "MembershipRole" NOT NULL,
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "invitedByUserId" INTEGER,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "company_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_memberships_userId_companyId_key" ON "company_memberships"("userId", "companyId");
CREATE INDEX "company_memberships_companyId_role_idx" ON "company_memberships"("companyId", "role");

ALTER TABLE "company_memberships"
  ADD CONSTRAINT "company_memberships_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "company_memberships" ("userId", "companyId", "role", "status", "joinedAt", "createdAt", "updatedAt")
SELECT "id", "companyId", "role"::text::"MembershipRole", 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "companyId" IS NOT NULL
  AND "role"::text IN ('COMPANY_ADMIN', 'FLEET_MANAGER', 'CUSTOMER')
ON CONFLICT ("userId", "companyId") DO NOTHING;
