const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: { OR: [{ email: { contains: "test" } }, { id: { startsWith: "test_" } }, { name: { contains: "Test" } }] },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("=== TEST USERS ===");
  users.forEach((u) => console.log(u.id, u.email, u.name, u.role, u.createdAt));
  console.log("Total:", users.length);

  const stores = await prisma.store.findMany({
    where: { OR: [{ name: { contains: "Test" } }, { slug: { startsWith: "test_" } }] },
    select: { id: true, name: true, slug: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("=== TEST STORES ===");
  stores.forEach((s) => console.log(s.id, s.name, s.slug, s.createdAt));
  console.log("Total:", stores.length);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
