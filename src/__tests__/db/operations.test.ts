import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/server/prisma";
import bcrypt from "bcryptjs";
import {
  createTestUser,
  createTestStore,
  createTestProduct,
  createTestOrder,
  createTestOrderItem,
  createTestCartItem,
  createTestChatMessage,
  createTestRating,
  cleanupTestData,
} from "../helpers";

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
}, 30000);

describe("User CRUD", () => {
  it("creates a user with all roles", async () => {
    for (const role of ["CUSTOMER", "VENDOR", "DELIVERY", "ADMIN"] as const) {
      const user = await createTestUser({ role });
      expect(user.id).toBeTruthy();
      expect(user.role).toBe(role);
      expect(user.email).toContain("test_");
    }
  });

  it("enforces unique email constraint", async () => {
    const email = `unique_${Date.now()}@test.com`;
    await createTestUser({ email });
    await expect(createTestUser({ email })).rejects.toThrow();
  });

  it("stores password hash correctly", async () => {
    const user = await createTestUser({ passwordHash: bcrypt.hashSync("MyPass123!", 10) });
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(bcrypt.compareSync("MyPass123!", found!.passwordHash)).toBe(true);
    expect(bcrypt.compareSync("WrongPass", found!.passwordHash)).toBe(false);
  });

  it("tracks failed login attempts", async () => {
    const user = await createTestUser();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: { increment: 1 }, lastFailedLoginAt: new Date() },
    });
    expect(updated.failedLoginAttempts).toBe(1);
    expect(updated.lastFailedLoginAt).toBeTruthy();
  });

  it("locks account after 5 failed attempts", async () => {
    const user = await createTestUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 5, lockoutUntil: new Date(Date.now() + 15 * 60 * 1000) },
    });
    const locked = await prisma.user.findUnique({ where: { id: user.id } });
    expect(locked!.lockoutUntil).toBeTruthy();
    expect(locked!.lockoutUntil!.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("Store CRUD", () => {
  it("creates a store with an owner", async () => {
    const store = await createTestStore();
    expect(store.id).toBeTruthy();
    expect(store.name).toBe("Test Store");
    expect(store.isActive).toBe(true);
    expect(store.isPublished).toBe(true);

    const owner = await prisma.user.findUnique({ where: { id: store.ownerId } });
    expect(owner).toBeTruthy();
    expect(owner!.role).toBe("VENDOR");
  });

  it("enforces unique slug", async () => {
    const slug = `slug_${Date.now()}`;
    await createTestStore({ slug });
    await expect(createTestStore({ slug })).rejects.toThrow();
  });

  it("supports multiple stores per owner", async () => {
    const owner = await createTestUser({ role: "VENDOR" });
    const s1 = await createTestStore({ ownerId: owner.id, slug: `multi_${Date.now()}_1` });
    const s2 = await createTestStore({ ownerId: owner.id, slug: `multi_${Date.now()}_2` });
    expect(s1.ownerId).toBe(owner.id);
    expect(s2.ownerId).toBe(owner.id);
  });
});

describe("Product CRUD", () => {
  it("creates a product with default values", async () => {
    const product = await createTestProduct();
    expect(product.id).toBeTruthy();
    expect(product.name).toBe("Test Product");
    expect(product.priceCents).toBe(1999);
    expect(product.isActive).toBe(true);
    expect(product.stock).toBe(100);
    expect(product.sellByWeight).toBe(false);
  });

  it("creates a sell-by-weight product", async () => {
    const product = await createTestProduct({
      sellByWeight: true,
      minWeightGrams: 200,
      maxWeightGrams: 3000,
      priceCents: 5000,
    });
    expect(product.sellByWeight).toBe(true);
    expect(product.minWeightGrams).toBe(200);
    expect(product.maxWeightGrams).toBe(3000);
  });

  it("filters active products for storefront", async () => {
    const store = await createTestStore();
    const active = await createTestProduct({ storeId: store.id, isActive: true });
    const inactive = await createTestProduct({ storeId: store.id, isActive: false });

    const storefrontProducts = await prisma.product.findMany({
      where: { storeId: store.id, isActive: true },
    });

    expect(storefrontProducts.some((p) => p.id === active.id)).toBe(true);
    expect(storefrontProducts.some((p) => p.id === inactive.id)).toBe(false);
  });

  it("tracks stock correctly", async () => {
    const product = await createTestProduct({ stock: 50 });
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { stock: { decrement: 3 } },
    });
    expect(updated.stock).toBe(47);
  });

  it("supports soft-delete via isUnavailable", async () => {
    const product = await createTestProduct();
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { isUnavailable: true },
    });
    expect(updated.isUnavailable).toBe(true);
  });
});

describe("Cart Operations", () => {
  it("adds items to cart with quantity and persists", async () => {
    const user = await createTestUser({ role: "CUSTOMER" });
    const product = await createTestProduct();

    const item = await createTestCartItem({ userId: user.id, productId: product.id, quantity: 2 });
    expect(item.quantity).toBe(2);
    expect(item.userId).toBe(user.id);
    expect(item.productId).toBe(product.id);
  });

  it("updates cart item quantity", async () => {
    const user = await createTestUser({ role: "CUSTOMER" });
    const product = await createTestProduct();

    const item = await createTestCartItem({ userId: user.id, productId: product.id, quantity: 1 });
    const updated = await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: 5 },
    });
    expect(updated.quantity).toBe(5);
  });

  it("deletes cart items", async () => {
    const user = await createTestUser({ role: "CUSTOMER" });
    const product = await createTestProduct();

    const item = await createTestCartItem({ userId: user.id, productId: product.id });
    await prisma.cartItem.delete({ where: { id: item.id } });

    const items = await prisma.cartItem.findMany({ where: { userId: user.id } });
    expect(items.length).toBe(0);
  });
});

describe("Order Flow", () => {
  it("creates order with items and calculates totals", async () => {
    const order = await createTestOrder();
    const item = await createTestOrderItem({ orderId: order.id });

    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });

    expect(fullOrder!.items.length).toBe(1);
    expect(fullOrder!.status).toBe("PENDING");
    expect(fullOrder!.totalCents).toBe(5000);
    expect(fullOrder!.fulfillmentType).toBe("DELIVERY");
    expect(fullOrder!.pickupCode).toBeTruthy();
    expect(fullOrder!.deliveryCode).toBeTruthy();
  });

  it("transitions through order statuses", async () => {
    const order = await createTestOrder();

    const transitions = ["CONFIRMED", "READY", "OUT_FOR_DELIVERY", "COMPLETED"] as const;
    for (const status of transitions) {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status },
      });
      expect(updated.status).toBe(status);
    }
  });

  it("cancels order and preserves cancelled status", async () => {
    const order = await createTestOrder();
    const cancelled = await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("assigns delivery user to order", async () => {
    const delivery = await createTestUser({ role: "DELIVERY" });
    const order = await createTestOrder();

    const assigned = await prisma.order.update({
      where: { id: order.id },
      data: { deliveryUserId: delivery.id, status: "OUT_FOR_DELIVERY" },
    });
    expect(assigned.deliveryUserId).toBe(delivery.id);
    expect(assigned.status).toBe("OUT_FOR_DELIVERY");
  });

  it("records arrival confirmation", async () => {
    const order = await createTestOrder({ status: "OUT_FOR_DELIVERY" });
    const arrived = await prisma.order.update({
      where: { id: order.id },
      data: { arrivedAt: new Date() },
    });
    expect(arrived.arrivedAt).toBeTruthy();

    const confirmed = await prisma.order.update({
      where: { id: order.id },
      data: { arrivalConfirmedAt: new Date() },
    });
    expect(confirmed.arrivalConfirmedAt).toBeTruthy();
  });

  it("creates pickup code and delivery code uniquely", async () => {
    const o1 = await createTestOrder();
    const o2 = await createTestOrder();
    expect(o1.pickupCode).not.toBe(o2.pickupCode);
    expect(o1.deliveryCode).not.toBe(o2.deliveryCode);
  });
});

describe("Chat Messages", () => {
  it("sends and retrieves messages in order", async () => {
    const customer = await createTestUser({ role: "CUSTOMER" });
    const delivery = await createTestUser({ role: "DELIVERY" });
    const order = await createTestOrder({ userId: customer.id, deliveryUserId: delivery.id });

    const msg1 = await createTestChatMessage({ orderId: order.id, senderId: customer.id, senderRole: "CUSTOMER", message: "Hola repartidor" });
    const msg2 = await createTestChatMessage({ orderId: order.id, senderId: delivery.id, senderRole: "DELIVERY", message: "Hola cliente, ya voy" });
    const msg3 = await createTestChatMessage({ orderId: order.id, senderId: customer.id, senderRole: "CUSTOMER", message: "Gracias" });

    const messages = await prisma.chatMessage.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    });

    expect(messages.length).toBe(3);
    expect(messages[0].message).toBe("Hola repartidor");
    expect(messages[1].message).toBe("Hola cliente, ya voy");
    expect(messages[2].message).toBe("Gracias");
  });

  it("stores sender role correctly", async () => {
    const customer = await createTestUser({ role: "CUSTOMER" });
    const order = await createTestOrder({ userId: customer.id });
    const msg = await createTestChatMessage({ orderId: order.id, senderId: customer.id, senderRole: "CUSTOMER" });

    expect(msg.senderRole).toBe("CUSTOMER");
  });
});

describe("Order Ratings", () => {
  it("creates rating with store and delivery scores", async () => {
    const order = await createTestOrder({ status: "COMPLETED" });
    const rating = await createTestRating({
      orderId: order.id,
      storeScore: 4,
      deliveryScore: 5,
      comment: "Excelente servicio",
    });

    expect(rating.storeScore).toBe(4);
    expect(rating.deliveryScore).toBe(5);
    expect(rating.comment).toBe("Excelente servicio");
  });

  it("enforces one rating per order", async () => {
    const order = await createTestOrder({ status: "COMPLETED" });
    await createTestRating({ orderId: order.id });
    await expect(createTestRating({ orderId: order.id })).rejects.toThrow();
  });

  it("allows rating without delivery score for PICKUP", async () => {
    const order = await createTestOrder({ status: "COMPLETED", fulfillmentType: "PICKUP" });
    const rating = await createTestRating({
      orderId: order.id,
      storeScore: 5,
      deliveryScore: null,
    });
    expect(rating.deliveryScore).toBeNull();
  });

  it("aggregates average store rating", async () => {
    const store = await createTestStore();
    const o1 = await createTestOrder({ storeId: store.id, status: "COMPLETED" });
    const o2 = await createTestOrder({ storeId: store.id, status: "COMPLETED" });
    const o3 = await createTestOrder({ storeId: store.id, status: "COMPLETED" });

    await createTestRating({ orderId: o1.id, storeScore: 5 });
    await createTestRating({ orderId: o2.id, storeScore: 4 });
    await createTestRating({ orderId: o3.id, storeScore: 3 });

    const ratings = await prisma.orderRating.findMany({
      where: { order: { storeId: store.id } },
    });
    const avg = ratings.reduce((sum, r) => sum + r.storeScore, 0) / ratings.length;
    expect(avg).toBe(4);
  });
});

describe("Multi-role Support", () => {
  it("stores additional roles as comma-separated string", async () => {
    const user = await prisma.user.create({
      data: {
        email: `multi_role_${Date.now()}@test.com`,
        role: "CUSTOMER",
        additionalRoles: "VENDOR,DELIVERY",
        passwordHash: bcrypt.hashSync("Test123!", 10),
      },
    });
    expect(user.additionalRoles).toBe("VENDOR,DELIVERY");
  });

  it("updates additional roles", async () => {
    const user = await createTestUser();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { additionalRoles: "VENDOR" },
    });
    expect(updated.additionalRoles).toBe("VENDOR");
  });
});
