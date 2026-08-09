<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Goal
- Complete a marketplace app with vendor/delivery portals, push notifications, session management, order cancellation, unified Capacitor app, multi-processor payment methods, vendor UX accessible to non-tech users, password recovery flow, product variants, delivery arrival notifications via WhatsApp/SMS, satisfaction surveys with rankings, multi-role accounts, admin product management, sell-by-weight products, customer arrival confirmation, real-time chat, redesigned cart/map UI, admin store editing, dynamic delivery fee, dark mode, pull-to-refresh, delivery dashboard redesigned for drivers on the move, admin dashboard with financial charts and logistics

## Constraints & Preferences
- (none)

## Progress
### Done
- **WhatsApp setup**: User app created with "Connect with customers through WhatsApp" use case. WhatsApp accessible via "Casos de uso" (use cases) pencil icon in sidebar.
- **Dark mode CSS overrides**: Added `.dark` overrides in `globals.css` for ~395 hardcoded Tailwind classes (`bg-white`, `bg-gray-50/100/200/300`, `text-gray-400/500/600/700/800/900`, etc.).
- **Flash prevention**: Inline `<script>` in `layout.tsx` to read `localStorage.darkMode` and apply `dark` class before hydration.
- **geo.ts fix**: TypeScript cast fix (`unknown` middle cast) at line 46.
- **Vendor product alerts**: Conditional banners on `/vendor/page.tsx` for 0 or <5 products.
- **Maps links in Capacitor Android**: Fixed via `geo:` protocol URLs + `window.open(url, "_system")` in `src/lib/geo.ts`.
- **Delivery dashboard redesigned** (`DeliveryTracker.tsx`): Larger text/buttons, active delivery cards, collapsible "Entregados" accordion, pulse animations, cash badges, QR scanner link, location status bar.
- **"Mis entregas" collapsible**: Active + pending deliveries wrapped in a collapsible accordion header with `showMyDeliveries` state. Comes expanded by default.
- **Inline QR scanner for store pickup**: Each pending delivery (CONFIRMED/READY) now has a "Llegué a la tienda" button that opens an inline scanner (using `html5-qrcode`) + manual code input. After scanning the store's delivery code, status becomes OUT_FOR_DELIVERY and the order moves to "En curso".
- **Removed "Escanear QR" link**: No longer in the "Mis entregas" header since pickup scanning is inline.
- **Viewport meta tag**: Added `viewport: { width: "device-width", initialScale: 1, maximumScale: 1 }` in `layout.tsx` via Next.js `Viewport` export to fix mobile zoom/scrolling issues.
- **Input font-size fix**: Delivery code input now has `[font-size:16px]` to prevent iOS Safari auto-zoom on focus.
- **Stores need coordinates for distance pricing**: Delivery fee falls back to flat $25 if store has no `latitude`/`longitude` set. Vendor must set location in `/vendor/mi-tienda`.
- **Available deliveries filter**: Changed `delivery/page.tsx` and `claim/route.ts` to only show CONFIRMED/READY (not PENDING). Orders must be accepted by store first before drivers can claim them.
- **Recharts installed**: Added `recharts` dependency for charts/graphs.
- **Admin stats API** (`/api/admin/stats`): Fetches totals (users, stores, products, orders), revenue data (daily over 30 days, top vendors), order status distribution, subscription stats (by status, monthly recurring revenue), category breakdown, and recent orders.
- **Admin dashboard client** (`AdminDashboardClient.tsx`): Full recharts-powered dashboard with animated counters, revenue area chart, top vendors bar chart, subscription pie chart, store categories bar chart, orders by status bar chart, orders-by-day line chart, recent orders list, and quick-access links to management pages.
- **Vende/Vende+ membership system**: `StorePlan { FREE MEMBER }` enum. FREE = store creation + in-store pickup only. Vende+ ($830/mes) = delivery + multi-product promotions + coupons + push notifications + online payments. Cart disables delivery for FREE stores. Vendor dashboard shows upsell banner. Promotions page shows upsell modal for FREE. Checkout API rejects DELIVERY for FREE. Vendor promotions API returns 403 for FREE. Webhook upgrades to MEMBER on payment. Cron skips FREE stores.
- **Membership pricing page redesigned**: Side-by-side Vende (free) vs Vende+ ($830/mes) with feature comparison lists, active plan badge, discount display.
- **Contract system removed**: Deleted `/contrato/`, `/api/contract/`, `/admin/contratos/`, all contract fields from Subscription model. Membership is now payment-only (no contract signing required).
- **Payment receipts**: `PaymentReceipt` model with sequential numbering (`REC-2026-07-0001`). Auto-generated on successful webhook payment. Vendor receipts page at `/vendor/recibos` with expandable details (period, coupon, payment reference).
- **Membership confirmation emails**: Resend-powered HTML email sent on successful payment. Includes receipt number, period covered, amount paid, coupon savings, and what's included in Vende+.
- **Membership coupon system**: Admin-editable `MembershipCoupon` model (code, % or fixed discount, max uses, dates). Admin page at `/admin/membresia-cupones`. Vendor coupon input on `/vendor/membresia` with validation API at `/api/vendor/membership-coupon`. Coupon encoded in MercadoPago external_reference for webhook tracking.
- **Pagos por transferencia**: `Order.paymentMethod` ahora acepta `TRANSFERENCIA`. El cliente sube captura de comprobante (vía `/api/upload`) + referencia opcional desde `/carrito`. El vendedor configura datos bancarios (banco, titular, CLABE + toggle) en `/vendor/pagos` (API `/api/vendor/transfer-info`). La orden guarda `paymentEvidenceUrl`, `paymentReference`, `paymentVerified`, `paymentVerifiedAt`. El vendedor verifica el pago desde `/vendor/pedidos` (lista y detalle) vía `POST /api/vendor/orders/[id]/verify-payment` (notifica al cliente). El status route bloquea CONFIRMED/READY/OUT_FOR_DELIVERY si el pago por transferencia no está verificado. Checkout valida que la tienda acepte transferencia + que haya captura. Commit `68b7423`.

### In Progress
- (none)

### Blocked
- Google reCAPTCHA v2 keys not yet created
- AWS SNS credentials not yet configured — SMS verification auto-verifies
- `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` env vars not set in Vercel
- Original keystore password unknown
- **WhatsApp Cloud API**: phone number `+52 1 722 762 4850` is `platform_type: "ON_PREMISE"` — needs new number added directly in App Dashboard

## Key Decisions
- **geo: protocol for maps in Capacitor**: `allowNavigation: ['*']` prevents HTTPS Google Maps URLs from opening externally. `geo:` + `_system` bypasses WebView entirely and launches Google Maps natively via Android Intent.
- **Delivery dashboard redesign**: Drivers need larger touch targets while moving. Active deliveries first with big cards; completed orders hidden behind collapsible section.
- **Dark mode CSS overrides instead of component rework**: Global `.dark` class overrides fix ~395 instances without touching individual components.
- **Inline QR scanner instead of separate page**: Pickup scanning embedded directly in each pending delivery card to avoid navigation away from the dashboard.
- **Only CONFIRMED/READY orders in available deliveries**: Prevents drivers from claiming orders before the store accepts them.
- **Viewport meta for mobile fix**: Without `<meta name="viewport">`, mobile browsers render at desktop width, causing zoom/scroll issues on input focus.
- **Admin dashboard as API + client component**: Server page fetches from `/api/admin/stats`, passes data to a client component using recharts. This keeps server-side lightweight and avoids recharts hydration issues.

## Next Steps
- Deploy to Vercel
- Test delivery dashboard on Android device
- Configure WhatsApp env vars for notifications
- Set store coordinates in `/vendor/mi-tienda` for distance-based delivery fee
- Create reCAPTCHA keys
- Configure AWS SNS creds

## Critical Context
- **DeliveryTracker.tsx**: Fully redesigned with 5 sections: collapsible "Mis entregas" (active + pending with inline pickup scanner), available deliveries, and collapsible "Entregados". Uses `showMyDeliveries` and `showDelivered` states.
- **Inline scanner**: Uses `html5-qrcode`. Scanner starts automatically when "Llegué a la tienda" is clicked. Manual code input fallback included. Calls `/api/delivery/confirm` with `action: "pickup"` to set status to OUT_FOR_DELIVERY.
- **pickupCode/deliveryCode**: `deliveryCode` is for store pickup (driver scans at store). `pickupCode` is for customer delivery confirmation (driver enters at customer's door).
- **Viewport**: Added via Next.js `Viewport` type export in `layout.tsx` — `width: device-width, initial-scale: 1, maximum-scale: 1`.
- **Available deliveries**: Now only shows CONFIRMED/READY (excludes PENDING). Claim route also rejects PENDING orders.
- **Flat $25 delivery fee fallback**: If store or customer coordinates are null, fee defaults to 2500 cents ($25).
- **Admin dashboard architecture**: `src/app/admin/page.tsx` is a lightweight server component that fetches from `/api/admin/stats` and passes data to `src/components/admin/AdminDashboardClient.tsx` (client component with recharts charts).

## Relevant Files
- `src/lib/geo.ts`: `getMapsUrl()` returns `geo:` URLs; `openMapsUrl()` uses `window.open(url, "_system")` only
- `src/components/orders/DeliveryTracker.tsx`: 5-section dashboard, collapsible "Mis entregas" + "Entregados", inline QR pickup scanner, "Llegué a la tienda" button, bigger text/buttons
- `src/app/globals.css` lines 203-212: dark mode CSS overrides
- `src/app/layout.tsx`: flash-prevention script, viewport export, font-size fix
- `src/app/vendor/page.tsx`: product count alert banners
- `capacitor.config.ts`: `allowNavigation: ['*']` — root cause of maps WebView loading
- `src/app/delivery/page.tsx`: available deliveries filter (CONFIRMED/READY only)
- `src/app/api/delivery/claim/route.ts`: only allows CONFIRMED/READY claims
- `prisma/schema.prisma`: Order model (deliveryCents, status, etc.), Store model (latitude, longitude)
- `src/app/carrito/page.tsx`: delivery fee preview based on store + customer coordinates
- `package.json`: added `recharts` dependency
- `src/app/api/admin/stats/route.ts`: admin stats API endpoint
- `src/components/admin/AdminDashboardClient.tsx`: recharts-powered admin dashboard
- `prisma/schema.prisma`: StorePlan enum, Store.plan, Subscription, Promotion models
- `src/app/vendor/membresia/page.tsx`: redesigned pricing page (Vende vs Vende+)
- `src/app/carrito/page.tsx`: delivery button disabled for FREE stores
- `src/app/vendor/promociones/page.tsx`: upsell modal for FREE stores
- `src/app/vendor/page.tsx`: upsell banner for FREE stores
- `src/app/api/vendor/store/route.ts`: returns store.plan
- `src/app/api/cart/items/route.ts`: returns store.plan
- `prisma/schema.prisma`: Order model (paymentMethod incl. TRANSFERENCIA, paymentEvidenceUrl, paymentReference, paymentVerified, paymentVerifiedAt), Store model (acceptsTransferencia, transferBankName, transferAccountHolder, transferClabe)
- `src/app/api/vendor/transfer-info/route.ts`: vendor GET/POST datos bancarios de transferencia (CLABE validada a 18 dígitos)
- `src/app/api/vendor/orders/[id]/verify-payment/route.ts`: marca pago verificado + notifica al cliente
- `src/app/vendor/pedidos/page.tsx` y `src/app/vendor/pedidos/[id]/page.tsx`: badge de transferencia, botón "Verificar pago", bloqueo de confirmar hasta verificar
- `src/app/carrito/page.tsx`: selector TRANSFERENCIA, datos bancarios con copiar CLABE, subida de captura, referencia

## Delivery Settings (last session)
- **`DeliverySettings` model** added to `prisma/schema.prisma` (single row `id: 1`): `baseFeeCents` (2500), `extraFeePerSegmentCents` (1000), `baseDistanceKm` (2), `segmentKm` (2), `fallbackFeeCents` (2500).
- **`/api/admin/delivery-settings`** GET/PUT (ADMIN-only, zod) — upserts row `id: 1`.
- **`/api/delivery-settings`** public GET for the cart — returns settings or defaults.
- **`calcDeliveryFeeCents(distanceKm, config?)`** in `src/lib/geo.ts` accepts optional `DeliveryFeeConfig`; old constants kept as fallback.
- **Checkout** (`/api/checkout/route.ts`) builds `feeConfig` from `DeliverySettings`; zone pricing still takes precedence; fallback now uses `fallbackFeeCents`.
- **Carrito** (`/carrito/page.tsx`) fetches `/api/delivery-settings` in both initial `useEffect` blocks and computes the preview fee from settings.
- **UI**: `/admin/pedidos` (`AdminOrdersClient.tsx`) has a "Tarifa general de envío" panel — view summary or edit (5 numeric inputs: base, extra per segment, base km, segment km, fallback), saved via PUT with loading/error feedback. Server page (`/admin/pedidos/page.tsx`) loads `deliverySettings` row and passes to client with defaults fallback.
- Deployed `9e72daa` — Ready on Vercel.

## Zonas de riesgo + Ruta real (this session)
- **Zonas de riesgo**: Removed color selector in `/admin/zonas-envio`; all zones render red (`RISK_COLOR = "#ef4444"`). `RISK_ZONE_EXTRA_CENTS = 2000` in `src/lib/geo.ts`. Checkout adds `$20 × nº de zonas de riesgo` where the customer falls, ON TOP of the base delivery fee (`src/app/api/checkout/route.ts`). API POST/PUT force `color: "#ef4444"` and `priceCents: 2000`; POST no longer requires `priceCents`.
- **Real route distance**: New `src/server/directions.ts` with `getRouteDistanceKm(originLat, originLng, destLat, destLng)` — tries Google **Routes API (New)** (POST `computeRoutes`, fieldmask `routes.distanceMeters`) then falls back to **Directions API (legacy)**; 10-min in-memory TTL cache keyed by 4-decimal coords; 4s fetch timeout. Uses `GOOGLE_MAPS_API_KEY_SERVER` env var, falling back to `NEXT_PUBLIC_GOOGLE_MAPS_KEY`.
- **Checkout** now uses route distance when available, else haversine straight-line (`routeKm ?? haversineDistance(...)`).
- **`/api/delivery/distance`** (authed + rate-limited by IP, 10/min) returns `{ ok, routeKm, straightKm }` for the cart preview.
- **Carrito** (`src/app/carrito/page.tsx`) has `routeKm` state; a `useEffect` fetches `/api/delivery/distance` when store+customer coords exist and fulfillmentType is DELIVERY; `deliveryFee` memo uses `routeKm ?? haversine`.
- **BLOCKER (resolved)**: Project `67218965388` had neither Routes API nor Directions API enabled. User hit `[OR-CBAT-23]` (Google billing error) when trying to enable it. Verified working on this date: Routes API returns HTTP 200 (e.g. `distanceMeters: 5765` for a test route). `.env.local` now also has `GOOGLE_MAPS_API_KEY_SERVER` (same key value as NEXT_PUBLIC for now).
- Deployed `2d57063` — Ready on Vercel.
