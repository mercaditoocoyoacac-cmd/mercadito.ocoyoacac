const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });
(async () => {
  const sql = `SELECT 'User' as tbl, count(*)::text as cnt FROM "User" WHERE "name" LIKE 'test_%' OR email LIKE 'test_%'
UNION ALL SELECT 'Store', count(*)::text FROM "Store" WHERE name LIKE 'test_%'
UNION ALL SELECT 'Product', count(*)::text FROM "Product" WHERE name LIKE 'test_%'
UNION ALL SELECT 'Order', count(*)::text FROM "Order" WHERE id LIKE 'test_%' OR id LIKE 'order_test_%'
UNION ALL SELECT 'OrderRating', count(*)::text FROM "OrderRating" WHERE id LIKE 'test_%'
UNION ALL SELECT 'ChatMessage', count(*)::text FROM "ChatMessage" WHERE id LIKE 'test_%'
UNION ALL SELECT 'CartItem', count(*)::text FROM "CartItem" WHERE id LIKE 'test_%'
UNION ALL SELECT 'StorePaymentMethod', count(*)::text FROM "StorePaymentMethod" WHERE id LIKE 'test_%'`;
  const r = await p.$queryRawUnsafe(sql);
  console.log(JSON.stringify(r, null, 2));
  await p.$disconnect();
})();
