require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const stores = await prisma.store.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      openTime: true,
      closeTime: true,
      scheduleDays: true,
      _count: { select: { orders: true } },
    },
  });

  console.log("=== STORES ===");
  for (const s of stores) {
    console.log(`\n${s.name} (${s.slug})`);
    console.log(`  ID: ${s.id}`);
    console.log(`  Owner: ${s.ownerId}`);
    console.log(`  openTime: ${s.openTime}`);
    console.log(`  closeTime: ${s.closeTime}`);
    console.log(`  scheduleDays: ${JSON.stringify(s.scheduleDays)}`);
    console.log(`  Orders: ${s._count.orders}`);

    if (!s.openTime || !s.closeTime) {
      console.log("  ⚠️  SIN HORARIO - tienda SIEMPRE abierta en checkout");
    }
  }

  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      storeId: true,
      fulfillmentType: true,
      customerName: true,
      deliveryUserId: true,
      createdAt: true,
      store: { select: { name: true, ownerId: true } },
      user: { select: { email: true, name: true } },
    },
  });

  console.log("\n=== RECENT ORDERS ===");
  for (const o of recentOrders) {
    console.log(`\n#${o.id.slice(-8).toUpperCase()}`);
    console.log(`  Store: ${o.store.name} (ID: ${o.storeId})`);
    console.log(`  Store Owner: ${o.store.ownerId}`);
    console.log(`  Customer: ${o.customerName} (${o.user.email})`);
    console.log(`  Delivery: ${o.deliveryUserId || "(none)"}`);
    console.log(`  Created: ${o.createdAt}`);
    console.log(`  Status: ${o.status}`);
    console.log(`  Type: ${o.fulfillmentType}`);
  }

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
