"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "./Button";
import { Badge } from "./Badge";

export type PaymentMethodType = "cash" | "card" | "transfer" | "wallet";

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  label: string;
  description?: string;
  icon?: ReactNode;
  isConfigured?: boolean;
  isDefault?: boolean;
  details?: {
    last4?: string;
    brand?: string;
    expiry?: string;
    bankName?: string | null;
    accountHolder?: string | null;
    clabe?: string | null;
  };
}

const typeIcons: Record<PaymentMethodType, ReactNode> = {
  cash: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  card: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  transfer: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  wallet: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
};

const typeColors: Record<PaymentMethodType, { bg: string; text: string; border: string }> = {
  cash: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  card: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  transfer: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  wallet: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

interface PaymentMethodCardProps {
  method: PaymentMethod;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  showActions?: boolean;
  compact?: boolean;
  disabled?: boolean;
  requiredConfig?: boolean;
}

export function PaymentMethodCard({ 
  method, 
  isSelected = false, 
  onSelect, 
  onEdit, 
  onDelete, 
  onSetDefault, 
  showActions = true,
  compact = false,
  disabled = false,
  requiredConfig = false
}: PaymentMethodCardProps) {
  const colors = typeColors[method.type];
  const Icon = method.icon || typeIcons[method.type];

  const needsConfig = requiredConfig && !method.isConfigured;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative rounded-xl border-2 p-4 transition-all duration-200
        ${isSelected 
          ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-lg shadow-[var(--accent)]/10" 
          : `${colors.border} bg-white hover:border-[var(--accent)]/50 hover:shadow-md`
        }
        ${onSelect && !disabled ? "cursor-pointer" : "cursor-default"}
        ${compact ? "p-3" : ""}
        ${disabled ? "opacity-50" : ""}
        ${needsConfig ? "ring-2 ring-amber-400" : ""}
      `}
      onClick={onSelect && !disabled ? onSelect : undefined}
      role={onSelect && !disabled ? "button" : undefined}
      tabIndex={onSelect && !disabled ? 0 : undefined}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !disabled) { e.preventDefault(); onSelect?.(); }}}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2">
          <svg className="h-6 w-6 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
      )}

      {needsConfig && (
        <div className="absolute -top-1.5 -right-1.5">
          <Badge variant="warning" size="sm" className="rounded-full px-2 py-0.5">
            Requiere configuración
          </Badge>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.bg}`} aria-hidden="true">
          {Icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{method.label}</span>
            {method.isDefault && (
              <Badge variant="success" size="sm" dot>Predeterminado</Badge>
            )}
            {!method.isConfigured && requiredConfig && (
              <Badge variant="warning" size="sm" dot>Pendiente</Badge>
            )}
          </div>
          {method.description && (
            <p className="mt-1 text-sm text-[color:var(--muted)] truncate">{method.description}</p>
          )}
          {method.details && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
              {method.details.last4 && (
                <span className="font-mono px-2 py-0.5 rounded bg-gray-100">•••• {method.details.last4}</span>
              )}
              {method.details.brand && (
                <span className="capitalize">{method.details.brand}</span>
              )}
              {method.details.expiry && (
                <span>{method.details.expiry}</span>
              )}
              {method.details.bankName && (
                <span>{method.details.bankName}</span>
              )}
              {method.details.accountHolder && (
                <span>Titular: {method.details.accountHolder}</span>
              )}
            </div>
          )}
        </div>

        {showActions && !disabled && (
          <div className="flex flex-col gap-1.5">
            {onSelect && !isSelected && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                disabled={!method.isConfigured && requiredConfig}
              >
                {method.isConfigured ? "Seleccionar" : "Configurar"}
              </Button>
            )}
            {onEdit && method.isConfigured && (
              <Button 
                variant="ghost" 
                size="sm" 
                leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
              >
                Editar
              </Button>
            )}
            {onDelete && method.isConfigured && (
              <Button 
                variant="ghost" 
                size="sm" 
                leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-red-600 hover:text-red-700"
              >
                Eliminar
              </Button>
            )}
            {!method.isDefault && onSetDefault && method.isConfigured && (
              <Button 
                variant="ghost" 
                size="sm" 
                leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                onClick={(e) => { e.stopPropagation(); onSetDefault(); }}
                className="text-amber-600 hover:text-amber-700"
              >
                Predet.
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface PaymentMethodListProps {
  methods: PaymentMethod[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
  onEdit: (method: PaymentMethod) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  requiredConfig?: boolean;
  emptyState?: {
    title: string;
    description: string;
    actionLabel: string;
  };
}

export function PaymentMethodList({ 
  methods, 
  selectedId, 
  onSelect, 
  onAdd, 
  onEdit, 
  onDelete, 
  onSetDefault,
  requiredConfig = false,
  emptyState = {
    title: "Sin métodos de pago",
    description: "Agrega una tarjeta o configura transferencia para pagar en línea",
    actionLabel: "Agregar método"
  }
}: PaymentMethodListProps) {
  const configuredMethods = methods.filter(m => m.isConfigured);
  const unconfiguredMethods = methods.filter(m => !m.isConfigured);

  return (
    <div className="space-y-4" role="list" aria-label="Métodos de pago">
      {configuredMethods.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">Configurados</h4>
          {configuredMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              isSelected={method.id === selectedId}
              onSelect={() => onSelect(method.id)}
              onEdit={() => onEdit(method)}
              onDelete={() => onDelete(method.id)}
              onSetDefault={() => onSetDefault(method.id)}
              requiredConfig={requiredConfig}
            />
          ))}
        </div>
      )}

      {unconfiguredMethods.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">Disponibles</h4>
          {unconfiguredMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              isSelected={method.id === selectedId}
              onSelect={() => onSelect(method.id)}
              onEdit={() => onEdit(method)}
              onDelete={() => onDelete(method.id)}
              onSetDefault={() => onSetDefault(method.id)}
              requiredConfig={requiredConfig}
            />
          ))}
        </div>
      )}

      {methods.length === 0 && onAdd && (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="font-semibold">{emptyState.title}</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{emptyState.description}</p>
          <Button variant="primary" size="md" onClick={onAdd} className="mt-4">
            {emptyState.actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}