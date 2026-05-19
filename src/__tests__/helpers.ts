import { prisma } from "@/server/prisma";
import bcrypt from "bcryptjs";

const TEST_PREFIX = `test_${Date.now()}_`;

let counter = 0;
function uniqueId(base: string): string {
  counter++;
  return `${TEST_PREFIX}${base}_${counter}`;
}

export async function createTestUser(overrides: Partial<{
  email: string;
  name: string;
  role: "CUSTOMER" | "VENDOR" | "DELIVERY" | "ADMIN";
  phone: string;
  passwordHash: string;
}> = {}) {
  const email = overrides.email || `${uniqueId("user")}@test.com`;
  return prisma.user.create({
    data: {
      email,
      name: overrides.name || "Test User",
      role: overrides.role || "CUSTOMER",
      phone: overrides.phone || "5550000000",
      passwordHash: overrides.passwordHash || bcrypt.hashSync("TestPass123!", 10),
    },
  });
}

export async function createTestStore(overrides: Partial<{
  name: string;
  slug: string;
  ownerId: string;
  isActive: boolean;
  isPublished: boolean;
  isApproved: boolean;
  address: string;
  phone: string;
}> = {}) {
  const owner = overrides.ownerId ? undefined : await createTestUser({ role: "VENDOR" });
  const slug = overrides.slug || uniqueId("store");
  return prisma.store.create({
    data: {
      name: overrides.name || "Test Store",
      slug,
      ownerId: overrides.ownerId || owner!.id,
      isActive: overrides.isActive ?? true,
      isPublished: overrides.isPublished ?? true,
      isApproved: overrides.isApproved ?? true,
      address: overrides.address || "Calle Test 123, Centro",
      phone: overrides.phone || "5550000001",
    },
  });
}

export async function createTestProduct(overrides: Partial<{
  name: string;
  priceCents: number;
  storeId: string;
  isActive: boolean;
  stock: number;
  sellByWeight: boolean;
  minWeightGrams: number;
  maxWeightGrams: number;
}> = {}) {
  const store = overrides.storeId ? undefined : await createTestStore();
  return prisma.product.create({
    data: {
      name: overrides.name || "Test Product",
      priceCents: overrides.priceCents ?? 1999,
      storeId: overrides.storeId || store!.id,
      isActive: overrides.isActive ?? true,
      stock: overrides.stock ?? 100,
      sellByWeight: overrides.sellByWeight ?? false,
      minWeightGrams: overrides.minWeightGrams ?? 100,
      maxWeightGrams: overrides.maxWeightGrams ?? 5000,
    },
  });
}

export async function createTestOrder(overrides: Partial<{
  userId: string;
  storeId: string;
  status: "PENDING" | "CONFIRMED" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED";
  fulfillmentType: "PICKUP" | "DELIVERY";
  paymentMethod: string;
  totalCents: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryUserId: string;
  pickupCode: string;
  deliveryCode: string;
}> = {}) {
  const customer = overrides.userId ? undefined : await createTestUser({ role: "CUSTOMER" });
  const store = overrides.storeId ? undefined : await createTestStore();

  return prisma.order.create({
    data: {
      userId: overrides.userId || customer!.id,
      storeId: overrides.storeId || store!.id,
      status: overrides.status || "PENDING",
      fulfillmentType: overrides.fulfillmentType || "DELIVERY",
      paymentMethod: overrides.paymentMethod || "CASH",
      totalCents: overrides.totalCents ?? 5000,
      subtotalCents: 5000,
      deliveryCents: overrides.fulfillmentType === "DELIVERY" ? 2500 : 0,
      customerName: overrides.customerName || "Test Customer",
      customerPhone: overrides.customerPhone || "5550000002",
      customerAddress: overrides.customerAddress || "Av Test 456, Centro",
      deliveryUserId: overrides.deliveryUserId || null,
      pickupCode: overrides.pickupCode || uniqueId("pickup"),
      deliveryCode: overrides.deliveryCode || uniqueId("delivery"),
    },
  });
}

export async function createTestOrderItem(overrides: Partial<{
  orderId: string;
  name: string;
  priceCents: number;
  quantity: number;
}> = {}) {
  if (!overrides.orderId) throw new Error("orderId is required");
  return prisma.orderItem.create({
    data: {
      orderId: overrides.orderId,
      name: overrides.name || "Test Item",
      priceCents: overrides.priceCents ?? 2500,
      quantity: overrides.quantity ?? 2,
    },
  });
}

export async function createTestCartItem(overrides: Partial<{
  userId: string;
  productId: string;
  quantity: number;
}> = {}) {
  const user = overrides.userId ? undefined : await createTestUser({ role: "CUSTOMER" });
  const product = overrides.productId ? undefined : await createTestProduct();

  return prisma.cartItem.create({
    data: {
      userId: overrides.userId || user!.id,
      productId: overrides.productId || product!.id,
      quantity: overrides.quantity ?? 1,
    },
  });
}

export async function createTestChatMessage(overrides: Partial<{
  orderId: string;
  senderId: string;
  senderRole: string;
  message: string;
}> = {}) {
  if (!overrides.orderId) throw new Error("orderId is required");
  const sender = overrides.senderId ? undefined : await createTestUser({ role: "CUSTOMER" });

  return prisma.chatMessage.create({
    data: {
      orderId: overrides.orderId,
      senderId: overrides.senderId || sender!.id,
      senderRole: overrides.senderRole || "CUSTOMER",
      message: overrides.message || "Test message",
    },
  });
}

export async function createTestRating(overrides: Partial<{
  orderId: string;
  storeScore: number;
  deliveryScore: number | null;
  comment: string;
}> = {}) {
  if (!overrides.orderId) throw new Error("orderId is required");
  return prisma.orderRating.create({
    data: {
      orderId: overrides.orderId,
      storeScore: overrides.storeScore ?? 5,
      deliveryScore: overrides.deliveryScore ?? null,
      comment: overrides.comment || "Great!",
    },
  });
}

export async function cleanupTestData() {
  await prisma.chatMessage.deleteMany({ where: { id: { startsWith: "test_" } } });
  await prisma.orderRating.deleteMany({ where: { orderId: { startsWith: "test_" } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { startsWith: "test_" } } });
  await prisma.order.deleteMany({ where: { id: { startsWith: "test_" } } });
  await prisma.cartItem.deleteMany({ where: { id: { startsWith: "test_" } } });
  await prisma.productVariant.deleteMany({ where: { productId: { startsWith: "test_" } } });
  await prisma.product.deleteMany({ where: { id: { startsWith: "test_" } } });
  await prisma.storePaymentMethod.deleteMany({ where: { storeId: { startsWith: "test_" } } });
  await prisma.store.deleteMany({ where: { id: { startsWith: "test_" } } });
  await prisma.session.deleteMany({ where: { userId: { startsWith: "test_" } } });
  await prisma.notification.deleteMany({ where: { userId: { startsWith: "test_" } } });
  await prisma.verification.deleteMany({ where: { userId: { startsWith: "test_" } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: "test_" } } });
}

export { TEST_PREFIX };
