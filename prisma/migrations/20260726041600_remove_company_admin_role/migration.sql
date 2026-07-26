-- Rebuild the PostgreSQL enum without the temporary COMPANY_ADMIN value.
-- The cast intentionally fails if a COMPANY_ADMIN user exists, preventing an
-- account from being silently reassigned to another role.
ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('ADMIN', 'FLEET_MANAGER', 'CUSTOMER', 'CAPTAIN', 'PORT_OPERATOR');

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role"
  USING ("role"::text::"Role");

DROP TYPE "Role_old";
