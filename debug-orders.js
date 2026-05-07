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
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      deliveryUserId: true,
      customerLat: true,
      customerLng: true,
      customerAddress: true,
      createdAt: true,
      store: { select: { id: true, name: true } },
      deliveryUser: { select: { id: true, name: true, email: true } },
      user: { select: { id: true, email: true } },
    },
  });

  console.log("=== ORDERS ===");
  for (const o of orders) {
    console.log(`\n#${o.id.slice(-8).toUpperCase()}`);
    console.log(`  createdAt (raw): ${o.createdAt}`);
    console.log(`  createdAt (ISO): ${o.createdAt.toISOString()}`);
    console.log(`  createdAt (local CST): ${o.createdAt.toLocaleString("es-MX", {timeZone:"America/Mexico_City"})}`);
    console.log(`  Store: ${o.store.name}`);
    console.log(`  Status: ${o.status}`);
    console.log(`  Type: ${o.fulfillmentType}`);
    console.log(`  Delivery User: ${o.deliveryUser ? o.deliveryUser.email : "(none)"}`);
    console.log(`  Customer: ${o.user.email}`);
    console.log(`  Lat/Lng: ${o.customerLat}, ${o.customerLng}`);
  }

  const drivers = await prisma.user.findMany({
    where: { role: "DELIVERY" },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      latitude: true,
      longitude: true,
      _count: {
        select: {
          deliveries: {
            where: { status: { in: ["OUT_FOR_DELIVERY", "READY", "CONFIRMED"] } },
          },
        },
      },
    },
  });

  console.log("\n=== DRIVERS ===");
  for (const d of drivers) {
    console.log(`${d.email} | active: ${d.isActive} | lat: ${d.latitude} | lng: ${d.longitude} | active deliveries: ${d._count.deliveries}`);
  }

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
