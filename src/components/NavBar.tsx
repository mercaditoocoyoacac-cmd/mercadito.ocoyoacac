"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function NavBar() {
  const { data } = useSession();
  const role = data?.user?.role;
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [vendorMenuOpen, setVendorMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;
  const isVendor = role === "VENDOR" || role === "ADMIN";
  const isDelivery = role === "DELIVERY";

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
            
            {data?.user && !isVendor && (
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
            
            {isVendor ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setVendorMenuOpen(!vendorMenuOpen)}
                  onBlur={() => setTimeout(() => setVendorMenuOpen(false), 150)}
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
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--border)] bg-white py-2 shadow-lg">
                    <div className="px-4 py-2 border-b border-[var(--border)]">
                      <div className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">Mi Tienda</div>
                    </div>
                    <Link
                      href="/vendor"
                      onClick={() => setVendorMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50"
                    >
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <div>
                        <div className="font-medium">Dashboard</div>
                        <div className="text-xs text-[color:var(--muted)]">Resumen y estadísticas</div>
                      </div>
                    </Link>
                    <Link
                      href="/vendor/mi-tienda"
                      onClick={() => setVendorMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50"
                    >
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <div>
                        <div className="font-medium">Editar Tienda</div>
                        <div className="text-xs text-[color:var(--muted)]">Nombre, logo, descripción</div>
                      </div>
                    </Link>
                    <Link
                      href="/vendor/productos"
                      onClick={() => setVendorMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50"
                    >
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <div>
                        <div className="font-medium">Mis Productos</div>
                        <div className="text-xs text-[color:var(--muted)]">Agregar, editar, eliminar</div>
                      </div>
                    </Link>
                    <div className="border-t border-[var(--border)] mt-2 pt-2">
                      <Link
                        href="/vendor/productos/nuevo"
                        onClick={() => setVendorMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <div className="font-medium">Nuevo Producto</div>
                      </Link>
                    </div>
                  </div>
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
            {data?.user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium truncate max-w-[150px]">{data.user.email}</div>
                  <div className="text-xs text-[color:var(--muted)] capitalize">{role?.toLowerCase()}</div>
                </div>
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
          </div>

          <button
            type="button"
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
              
              {data?.user && !isVendor && (
                <Link
                  href="/mis-pedidos"
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                    isActive("/mis-pedidos") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                  }`}
                >
                  Mis pedidos
                </Link>
              )}
              
              {isVendor ? (
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
                <Link
                  href="/delivery"
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                    pathname.startsWith("/delivery") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--muted)]"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                  Panel Repartidor
                </Link>
              ) : null}
              
              <div className="my-2 border-t border-[var(--border)]"></div>
              
              {data?.user ? (
                <>
                  <div className="px-4 py-2 text-xs text-[color:var(--muted)]">
                    {data.user.email}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                    className="rounded-lg px-4 py-3 text-sm font-medium text-left text-red-600 hover:bg-red-50"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-medium text-[color:var(--muted)]"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/registro"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-medium text-center text-white"
                  >
                    Crear cuenta
                  </Link>
                  <Link
                    href="/delivery/login"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-medium text-center text-[color:var(--muted)]"
                  >
                    Soy repartidor
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
