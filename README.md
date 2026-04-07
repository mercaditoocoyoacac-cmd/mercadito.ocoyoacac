# Mercadito Ocoyoacac

Marketplace **multi-vendedor** para negocios locales: cada negocio crea su tienda digital, publica productos y recibe pedidos de clientes.

## Stack (MVP)

- **Next.js (App Router) + Tailwind**
- **Prisma + SQLite** (dev local)
- **NextAuth (Credentials)** para login

## Requisitos

- Node.js 20+ (tú tienes Node 24, perfecto)

## Correr en local

```bash
cd mercadito-ocoyoacac
npm install
npx prisma migrate dev
npm run dev
```

Abre `http://localhost:3000`.

## Flujo MVP

- **Cliente**:
  - Ver tiendas: `/tiendas`
  - Entrar a una tienda: `/tienda/[slug]`
  - Agregar al carrito y confirmar pedido: `/carrito`
- **Vendedor**:
  - Registro: `/registro`
  - Crear tienda: `/vendor/onboarding`
  - Crear productos: `/vendor/productos/nuevo`

## Notas importantes

- El carrito (MVP) **solo permite productos de una tienda** a la vez. Si agregas un producto de otra tienda, el carrito se limpia.
- Checkout del MVP es **pago contraentrega / al recoger** (sin Stripe todavía).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
