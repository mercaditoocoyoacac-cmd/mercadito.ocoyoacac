-- =====================================================================
-- Mercadito Ocoyoacac - Capa de reporting para Power BI
-- =====================================================================
-- Este script crea:
--   1) Un rol de SOLO LECTURA para que Power BI se conecte.
--   2) Un esquema "reporting" con VISTAS listas para el modelo de Power BI
--      (montos en centavos y en MXN, fechas en hora de Mexico).
--
-- Ejecutar UNA vez contra la base de Neon (SQL Editor de Neon, o
--   npx prisma db execute --file prisma/reporting/powerbi_setup.sql --schema prisma/schema.prisma
-- ).
--
-- IMPORTANTE: cambia la contrasena del rol antes de ejecutar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Rol de solo lectura
-- ---------------------------------------------------------------------
-- Cambia 'CAMBIAR_ESTA_PASSWORD' por una contrasena fuerte y unica.
CREATE ROLE powerbi_readonly WITH LOGIN PASSWORD 'CAMBIAR_ESTA_PASSWORD';

GRANT CONNECT ON DATABASE neondb TO powerbi_readonly;

-- ---------------------------------------------------------------------
-- 2) Esquema de reporting
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS reporting;
GRANT USAGE ON SCHEMA reporting TO powerbi_readonly;

-- ---------------------------------------------------------------------
-- 3) Vistas
-- ---------------------------------------------------------------------

-- 3.1 Pedidos (tabla de hechos principal)
CREATE OR REPLACE VIEW reporting.pedidos AS
SELECT
  o.id                                   AS pedido_id,
  o."createdAt"                          AS creado_en_utc,
  (o."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City') AS creado_en,
  o."createdAt"::date                    AS fecha,
  o.status                               AS estado,
  o."fulfillmentType"                    AS tipo_entrega,
  o."paymentMethod"                      AS metodo_pago,
  o."paymentVerified"                    AS pago_verificado,
  o."customerName"                       AS cliente,
  o."customerPhone"                      AS cliente_telefono,
  o."customerAddress"                    AS cliente_direccion,
  o."subtotalCents"                      AS subtotal_centavos,
  o."deliveryCents"                      AS envio_centavos,
  COALESCE(o."couponDiscountCents", 0)   AS cupon_centavos,
  o."commissionCents"                    AS comision_centavos,
  o."vendorPayoutCents"                  AS pago_vendedor_centavos,
  o."totalCents"                         AS total_centavos,
  o."subtotalCents" / 100.0              AS subtotal_mxn,
  o."deliveryCents" / 100.0              AS envio_mxn,
  COALESCE(o."couponDiscountCents", 0) / 100.0 AS cupon_mxn,
  o."commissionCents" / 100.0            AS comision_mxn,
  o."vendorPayoutCents" / 100.0          AS pago_vendedor_mxn,
  o."totalCents" / 100.0                 AS total_mxn,
  o."storeId"                            AS tienda_id,
  s.name                                 AS tienda,
  s.category                             AS categoria,
  s.plan                                 AS plan_tienda,
  o."deliveryUserId"                     AS repartidor_id
FROM "Order" o
JOIN "Store" s ON s.id = o."storeId";

-- 3.2 Lineas de pedido (productos vendidos)
CREATE OR REPLACE VIEW reporting.pedido_items AS
SELECT
  oi.id                        AS item_id,
  oi."orderId"                 AS pedido_id,
  o."createdAt"::date          AS fecha,
  o.status                     AS estado,
  o."storeId"                  AS tienda_id,
  s.name                       AS tienda,
  oi."productId"               AS producto_id,
  oi.name                      AS producto,
  oi."variantName"             AS variante,
  oi.quantity                  AS cantidad,
  oi."weightGrams"             AS gramos,
  oi."priceCents"              AS precio_unitario_centavos,
  (oi."priceCents" * oi.quantity)               AS total_centavos,
  (oi."priceCents" * oi.quantity) / 100.0       AS total_mxn
FROM "OrderItem" oi
JOIN "Order" o ON o.id = oi."orderId"
JOIN "Store" s ON s.id = o."storeId";

-- 3.3 Tiendas (dimension)
CREATE OR REPLACE VIEW reporting.tiendas AS
SELECT
  s.id                        AS tienda_id,
  s.name                      AS tienda,
  s.slug,
  s.category                  AS categoria,
  s.plan                      AS plan,
  s."isActive"                AS activa,
  s."isPublished"             AS publicada,
  s."isApproved"              AS aprobada,
  s."createdAt"::date         AS creada,
  u.email                     AS dueno_email,
  sub.status                  AS suscripcion_estado,
  sub."endDate"::date         AS suscripcion_fin,
  sub."monthlyPriceCents" / 100.0 AS mensualidad_mxn
FROM "Store" s
JOIN "User" u ON u.id = s."ownerId"
LEFT JOIN "Subscription" sub ON sub."storeId" = s.id;

-- 3.4 Productos (dimension)
CREATE OR REPLACE VIEW reporting.productos AS
SELECT
  p.id                        AS producto_id,
  p.name                      AS producto,
  p."storeId"                 AS tienda_id,
  s.name                      AS tienda,
  p."priceCents" / 100.0      AS precio_mxn,
  p."soldCount"               AS vendidos,
  p.stock,
  p."isActive"                AS activo,
  p."isUnavailable"           AS no_disponible,
  p."isPromotion"             AS en_promocion,
  p."createdAt"::date         AS creado
FROM "Product" p
JOIN "Store" s ON s.id = p."storeId";

-- 3.5 Clientes (dimension)
CREATE OR REPLACE VIEW reporting.clientes AS
SELECT
  u.id                        AS cliente_id,
  u.email,
  u.name                      AS nombre,
  u.city                      AS ciudad,
  u."createdAt"::date         AS registrado,
  u."isActive"                AS activo
FROM "User" u
WHERE u.role = 'CUSTOMER';

-- 3.6 Repartidores (dimension)
CREATE OR REPLACE VIEW reporting.repartidores AS
SELECT
  u.id                        AS repartidor_id,
  u.email,
  u.name                      AS nombre,
  u."isActive"                AS activo,
  u."driverDocsApproved"      AS docs_aprobados,
  u."createdAt"::date         AS registrado
FROM "User" u
WHERE u.role = 'DELIVERY';

-- 3.7 Membresias y pagos (ingresos de plataforma)
CREATE OR REPLACE VIEW reporting.pagos_membresia AS
SELECT
  pr.id                       AS pago_id,
  pr."receiptNumber"          AS folio,
  pr."issuedAt"::date         AS fecha,
  pr."storeId"                AS tienda_id,
  s.name                      AS tienda,
  s.plan                      AS plan,
  pr."amountCents" / 100.0    AS monto_mxn,
  pr."couponCode"             AS cupon,
  COALESCE(pr."couponSavings", 0) / 100.0 AS descuento_mxn,
  pr."paymentMethod"          AS metodo_pago,
  pr.status                   AS estado,
  pr."periodStart"::date      AS periodo_inicio,
  pr."periodEnd"::date        AS periodo_fin
FROM "PaymentReceipt" pr
JOIN "Store" s ON s.id = pr."storeId";

-- 3.8 Suscripciones (dimension)
CREATE OR REPLACE VIEW reporting.suscripciones AS
SELECT
  sub.id                      AS suscripcion_id,
  sub."storeId"               AS tienda_id,
  s.name                      AS tienda,
  s.plan                      AS plan,
  sub.status                  AS estado,
  sub."startDate"::date       AS inicio,
  sub."endDate"::date         AS fin,
  sub."monthlyPriceCents" / 100.0 AS mensualidad_mxn
FROM "Subscription" sub
JOIN "Store" s ON s.id = sub."storeId";

-- 3.9 Valoraciones (satisfaccion)
CREATE OR REPLACE VIEW reporting.valoraciones AS
SELECT
  r.id                        AS valoracion_id,
  r."orderId"                 AS pedido_id,
  o."storeId"                 AS tienda_id,
  s.name                      AS tienda,
  r."createdAt"::date         AS fecha,
  r."storeScore"              AS calificacion_tienda,
  r."packagingScore"          AS calificacion_empaque,
  r."completenessScore"       AS calificacion_completitud,
  r."deliveryScore"           AS calificacion_entrega,
  r."timelinessScore"         AS calificacion_puntualidad
FROM "OrderRating" r
JOIN "Order" o ON o.id = r."orderId"
JOIN "Store" s ON s.id = o."storeId";

-- 3.10 Dimension de fecha (2025-2027)
CREATE OR REPLACE VIEW reporting.dim_fecha AS
SELECT
  d::date                     AS fecha,
  EXTRACT(YEAR FROM d)::int   AS anio,
  EXTRACT(MONTH FROM d)::int  AS mes,
  to_char(d, 'TMMonth')       AS mes_nombre,
  EXTRACT(DAY FROM d)::int    AS dia,
  EXTRACT(ISODOW FROM d)::int AS dia_semana,
  to_char(d, 'TMDay')         AS dia_nombre
FROM generate_series('2025-01-01'::date, '2027-12-31'::date, '1 day') AS d;

-- ---------------------------------------------------------------------
-- 4) Permisos: SOLO lectura sobre las vistas de reporting
-- ---------------------------------------------------------------------
GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO powerbi_readonly;

-- Asegura permisos para vistas creadas en el futuro
ALTER DEFAULT PRIVILEGES IN SCHEMA reporting GRANT SELECT ON TABLES TO powerbi_readonly;

-- =====================================================================
-- Cadena de conexion para Power BI (Get Data > PostgreSQL database):
--   Server:   ep-aged-base-amo1exag.c-5.us-east-1.aws.neon.tech
--   Database: neondb
--   User:     powerbi_readonly
--   Password: (la que definiste arriba)
--   SSL:      requerido
-- =====================================================================
