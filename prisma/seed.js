import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@shipops.dev";
  const password = "Admin@1234";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Default admin already exists (${email}), skipping.`);
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      name: "Default Admin",
      email,
      password: hashed,
      role: "ADMIN",
    },
  });

  console.log(`✅ Default admin created: ${admin.email}`);
  console.log(`   Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
