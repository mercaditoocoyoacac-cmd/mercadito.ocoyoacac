"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";

export function NavBar() {
  const { data, update } = useSession();
  const role = data?.user?.role;
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [vendorMenuOpen, setVendorMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path;
  const isVendor = role === "VENDOR";
  const isDelivery = role === "DELIVERY";
  const isAdmin = role === "ADMIN";

  const additionalRoles = data?.user?.additionalRoles?.split(",").filter(Boolean) || [];

  async function switchRole(newRole: string) {
    const res = await fetch("/api/auth/switch-role", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      await update();
      if (newRole === "DELIVERY") router.push("/delivery");
      else if (newRole === "CUSTOMER") router.push("/");
      else if (newRole === "VENDOR") router.push("/vendor");
      else if (newRole === "ADMIN") router.push("/admin");
    }
  }

  const navigateTo = (href: string) => {
    setVendorMenuOpen(false);
    router.push(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
              <span className="text-lg font-bold text-white">M</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold tracking-tight">Mercadito</span>
              <span className="ml-1 text-sm text-[color:var(--muted)]">Ocoyoacac</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/tiendas"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive("/tiendas")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[color:var(--muted)] hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              Tiendas
            </Link>
            <Link
              href="/carrito"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive("/carrito")
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[color:var(--muted)] hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Carrito
            </Link>
            
            {data?.user && !isVendor && role !== "ADMIN" && (
              <Link
                href="/mis-pedidos"
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive("/mis-pedidos")
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[color:var(--muted)] hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Mis pedidos
              </Link>
            )}
            
            {data?.user && (
              <Link
                href="/perfil"
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive("/perfil")
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[color:var(--muted)] hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Mi perfil
              </Link>
            )}
            
            {!data?.user && (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[color:var(--muted)] hover:bg-gray-100 hover:text-gray-900"
                >
                  Entrar
                </Link>
                <Link
                  href="/registro"
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
                >
                  Registrarse
                </Link>
              </div>
            )}
            
            {isAdmin ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setVendorMenuOpen(!vendorMenuOpen)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                    pathname.startsWith("/admin")
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin
                  <svg className={`h-4 w-4 transition-transform ${vendorMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {vendorMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[-1]"
                      onClick={() => setVendorMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--border)] bg-white py-2 shadow-lg z-50">
                      <div className="px-4 py-2 border-b border-[var(--border)]">
                        <div className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">Administración</div>
                      </div>
                      <button
                        onClick={() => navigateTo("/admin")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <div>
                          <div className="font-medium">Dashboard</div>
                          <div className="text-xs text-[color:var(--muted)]">Estadísticas generales</div>
                        </div>
                      </button>
                      <button
                        onClick={() => navigateTo("/admin/envios")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div>
                          <div className="font-medium">Envíos</div>
                          <div className="text-xs text-[color:var(--muted)]">Supervisión de entregas</div>
                        </div>
                      </button>
                      <button
                        onClick={() => navigateTo("/admin/membresias")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <div>
                          <div className="font-medium">Membresías</div>
                          <div className="text-xs text-[color:var(--muted)]">Gestionar tiendas</div>
                        </div>
                      </button>
                      <button
                        onClick={() => navigateTo("/admin/usuarios")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <div>
                          <div className="font-medium">Usuarios</div>
                          <div className="text-xs text-[color:var(--muted)]">Clientes, vendedores, repartidores</div>
                        </div>
                      </button>
                      <button
                        onClick={() => navigateTo("/admin/pedidos")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <div>
                          <div className="font-medium">Pedidos</div>
                          <div className="text-xs text-[color:var(--muted)]">Todos los pedidos</div>
                        </div>
                      </button>
                      <button
                        onClick={() => navigateTo("/admin/tiendas")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <div>
                          <div className="font-medium">Tiendas</div>
                          <div className="text-xs text-[color:var(--muted)]">Editar datos de tiendas</div>
                        </div>
                      </button>
                      <button
                        onClick={() => navigateTo("/admin/categorias")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <div>
                          <div className="font-medium">Categorías</div>
                          <div className="text-xs text-[color:var(--muted)]">Clasificaciones de tiendas</div>
                        </div>
                      </button>
                      <button
                        onClick={() => navigateTo("/admin/productos")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <div>
                          <div className="font-medium">Productos</div>
                          <div className="text-xs text-[color:var(--muted)]">Agregar a tiendas</div>
                        </div>
                      </button>
                      <button
                        onClick={() => navigateTo("/admin/mercado-pago")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <div>
                          <div className="font-medium">Pagos</div>
                          <div className="text-xs text-[color:var(--muted)]">Configurar métodos de pago</div>
                        </div>
                      </button>
                      <button
                        onClick={() => navigateTo("/contrato")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <div className="font-medium">Contrato</div>
                          <div className="text-xs text-[color:var(--muted)]">Términos y condiciones</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : isVendor ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setVendorMenuOpen(!vendorMenuOpen)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                    pathname.startsWith("/vendor")
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Mi Tienda
                  <svg className={`h-4 w-4 transition-transform ${vendorMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {vendorMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[-1]"
                      onClick={() => setVendorMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--border)] bg-white py-2 shadow-lg z-50">
                      <div className="px-4 py-2 border-b border-[var(--border)]">
                        <div className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">Mi Tienda</div>
                      </div>
                      <button
                        onClick={() => navigateTo("/vendor")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <div>
                          <div className="font-medium">Dashboard</div>
                          <div className="text-xs text-[color:var(--muted)]">Resumen y estadísticas</div>
                        </div>
                      </button>
                      <button
                        onClick={() => navigateTo("/vendor/mi-tienda")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <div>
                          <div className="font-medium">Editar Tienda</div>
                          <div className="text-xs text-[color:var(--muted)]">Nombre, logo, descripción</div>
                        </div>
                      </button>
                      <button
                        onClick={() => navigateTo("/vendor/productos")}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-gray-50"
                      >
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <div>
                          <div className="font-medium">Mis Productos</div>
                          <div className="text-xs text-[color:var(--muted)]">Agregar, editar, eliminar</div>
                        </div>
                      </button>
                      <div className="border-t border-[var(--border)] mt-2 pt-2">
                        <button
                          onClick={() => navigateTo("/vendor/productos/nuevo")}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <div className="font-medium">Nuevo Producto</div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : isDelivery ? (
              <Link
                href="/delivery"
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                  pathname.startsWith("/delivery")
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                Repartidor
              </Link>
            ) : null}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {data?.user && role && role !== "VENDOR" && role !== "ADMIN" && (
              <Link
                href="/vendor/upgrade"
                className="rounded-lg border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
              >
                Vender
              </Link>
            )}
            {role && role !== "DELIVERY" && !additionalRoles.includes("DELIVERY") && (
              <Link
                href="/delivery/registro"
                className="rounded-lg border border-orange-500 px-4 py-2 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-50"
              >
                Repartir
              </Link>
            )}
            {role && role !== "CUSTOMER" && !additionalRoles.includes("CUSTOMER") && (
              <Link
                href="/registro"
                className="rounded-lg border border-rose-500 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
              >
                Comprar
              </Link>
            )}
            {data?.user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium truncate max-w-[150px]">{data.user.email}</div>
                  <div className="text-xs text-[color:var(--muted)] capitalize">{role?.toLowerCase()}</div>
                </div>
                {additionalRoles.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {additionalRoles.includes("DELIVERY") && role !== "DELIVERY" && (
                      <button
                        type="button"
                        onClick={() => switchRole("DELIVERY")}
                        className="rounded-lg bg-orange-500 px-2 py-1 text-xs font-medium text-white hover:bg-orange-600"
                      >
                        Repartidor
                      </button>
                    )}
                    {additionalRoles.includes("CUSTOMER") && role !== "CUSTOMER" && (
                      <button
                        type="button"
                        onClick={() => switchRole("CUSTOMER")}
                        className="rounded-lg bg-rose-500 px-2 py-1 text-xs font-medium text-white hover:bg-rose-600"
                      >
                        Cliente
                      </button>
                    )}
                    {additionalRoles.includes("VENDOR") && role !== "VENDOR" && (
                      <button
                        type="button"
                        onClick={() => switchRole("VENDOR")}
                        className="rounded-lg bg-emerald-500 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                      >
                        Vendedor
                      </button>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--muted)] transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[color:var(--muted)] transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  Entrar
                </Link>
                <Link
                  href="/registro"
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
                >
                  Registrarse
                </Link>
                <Link
                  href="/delivery/login"
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--muted)] transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  Repartidor
                </Link>
              </div>
            )}
            <DarkModeToggle />
          </div>

          <button
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            className="md:hidden rounded-lg p-2 text-[color:var(--muted)] hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-[var(--border)] py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              <Link
                href="/tiendas"
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-4 py-3 text-sm font-medium ${
                  isActive("/tiendas") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                }`}
              >
                Tiendas
              </Link>
              <Link
                href="/carrito"
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                  isActive("/carrito") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                }`}
              >
                Carrito
              </Link>
              
              {data?.user && (
                <>
                  <Link
                    href="/mis-pedidos"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                      isActive("/mis-pedidos") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Mis pedidos
                  </Link>
                  <Link
                    href="/perfil"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                      isActive("/perfil") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Mi perfil
                  </Link>
                  <Link
                    href="/perfil/dispositivos"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                      isActive("/perfil/dispositivos") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Dispositivos
                  </Link>
                </>
              )}
              
              {isAdmin ? (
                <>
                  <div className="my-2 border-t border-[var(--border)]"></div>
                  <div className="px-4 py-2 text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">Administración</div>
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === "/admin" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Dashboard Admin
                  </Link>
                  <Link
                    href="/admin/envios"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === "/admin/envios" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Envíos
                  </Link>
                  <Link
                    href="/admin/membresias"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === "/admin/membresias" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Membresías
                  </Link>
                  <Link
                    href="/admin/usuarios"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === "/admin/usuarios" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Usuarios
                  </Link>
                  <Link
                    href="/admin/aprobacion"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === "/admin/aprobacion" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Aprobar Vend.
                  </Link>
                  <Link
                    href="/admin/pedidos"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === "/admin/pedidos" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Pedidos
                  </Link>
                  <Link
                    href="/admin/tiendas"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === "/admin/tiendas" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Tiendas
                  </Link>
                  <Link
                    href="/admin/categorias"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === "/admin/categorias" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Categorías
                  </Link>
                  <Link
                    href="/admin/productos"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === "/admin/productos" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Productos
                  </Link>
                  <Link
                    href="/admin/mercado-pago"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === "/admin/mercado-pago" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    MercadoPago
                  </Link>
                </>
              ) : isVendor ? (
                <>
                  <div className="my-2 border-t border-[var(--border)]"></div>
                  <div className="px-4 py-2 text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">Mi Tienda</div>
                  <Link
                    href="/vendor"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === "/vendor" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/vendor/mi-tienda"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname === "/vendor/mi-tienda" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Editar Tienda
                  </Link>
                  <Link
                    href="/vendor/productos"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium ${
                      pathname.startsWith("/vendor/productos") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    Mis Productos
                  </Link>
                  <Link
                    href="/vendor/productos/nuevo"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-medium text-[var(--accent)]"
                  >
                    + Nuevo Producto
                  </Link>
                </>
              ) : isDelivery ? (
                <>
                  <Link
                    href="/delivery"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                      pathname === "/delivery" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                    Mis entregas
                  </Link>
                  <Link
                    href="/delivery/escanear"
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                      pathname === "/delivery/escanear" ? "bg-orange-100 text-orange-600" : "text-orange-600"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Escanear QR
                  </Link>
                </>
              ) : null}
              
              <div className="my-2 border-t border-[var(--border)]"></div>
              
              {data?.user && (
                <>
                  <div className="text-xs text-[color:var(--muted)]">
                    {data.user.email}
                  </div>
                  {role !== "VENDOR" && role !== "ADMIN" && (
                    <Link
                      href="/vendor/upgrade"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-lg px-4 py-3 text-sm font-medium text-[var(--accent)]"
                    >
                      Convertirme en vendedor
                    </Link>
                  )}
                  {role !== "DELIVERY" && !additionalRoles.includes("DELIVERY") && (
                    <Link
                      href="/delivery/registro"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-lg px-4 py-3 text-sm font-medium text-orange-600"
                    >
                      Quiero repartir
                    </Link>
                  )}
                  {role !== "CUSTOMER" && !additionalRoles.includes("CUSTOMER") && (
                    <Link
                      href="/registro"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-lg px-4 py-3 text-sm font-medium text-rose-600"
                    >
                      Quiero comprar
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                    className="rounded-lg px-4 py-3 text-sm font-medium text-left text-red-600 hover:bg-red-50"
                  >
                    Cerrar sesión
                  </button>
                </>
              )}

              {!data?.user && (
                <>
                  <div className="my-2 border-t border-[var(--border)]"></div>
                  <div className="px-4 py-2 text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">Mi cuenta</div>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-medium text-[var(--accent)]"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/registro"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-medium text-[var(--accent)]"
                  >
                    Registrarse
                  </Link>
                  <div className="my-2 border-t border-[var(--border)]"></div>
                  <Link
                    href="/vendor/registro"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-medium text-[color:var(--muted)]"
                  >
                    Soy vendedor
                  </Link>
                  <Link
                    href="/delivery/registro"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-medium text-[color:var(--muted)]"
                  >
                    Soy repartidor
                  </Link>
                </>
              )}
              <div className="my-2 border-t border-[var(--border)]"></div>
              <div className="px-4 py-2">
                <DarkModeToggle />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
