"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "./Button";
import { Badge } from "./Badge";

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  instructions?: string;
}

export interface AddressCardProps {
  address: Address;
  isSelected?: boolean;
  onSelect?: (address: Address) => void;
  onEdit?: (address: Address) => void;
  onDelete?: (id: string) => void;
  onSetDefault?: (id: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function AddressCard({ 
  address, 
  isSelected = false, 
  onSelect, 
  onEdit, 
  onDelete, 
  onSetDefault, 
  showActions = true,
  compact = false 
}: AddressCardProps) {
  const fullAddress = [address.street, address.city, address.state, address.zipCode].filter(Boolean).join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative rounded-xl border-2 p-4 transition-all duration-200
        ${isSelected 
          ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-lg shadow-[var(--accent)]/10" 
          : "border-[var(--border)] bg-white hover:border-[var(--accent)]/50 hover:shadow-md"
        }
        ${onSelect ? "cursor-pointer" : ""}
        ${compact ? "p-3" : ""}
      `}
      onClick={() => onSelect?.(address)}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(address); }}}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2">
          <svg className="h-6 w-6 text-[var(--accent)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`
          flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
          ${address.isDefault ? "bg-amber-100 text-amber-600" : "bg-[var(--accent-soft)] text-[var(--accent)]"}
        `} aria-hidden="true">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{address.label}</span>
            {address.isDefault && (
              <Badge variant="warning" size="sm" dot>Predeterminada</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-[color:var(--muted)] truncate">{fullAddress}</p>
          {address.instructions && (
            <p className="mt-1 text-xs text-[color:var(--muted)] italic">"{address.instructions}"</p>
          )}
        </div>

        {showActions && (
          <div className="flex flex-col gap-1.5">
            {onSelect && !isSelected && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); onSelect(address); }}
              >
                Seleccionar
              </Button>
            )}
            {onEdit && (
              <Button 
                variant="ghost" 
                size="sm" 
                leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                onClick={(e) => { e.stopPropagation(); onEdit(address); }}
              >
                Editar
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="ghost" 
                size="sm" 
                leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                onClick={(e) => { e.stopPropagation(); onDelete(address.id); }}
                className="text-red-600 hover:text-red-700"
              >
                Eliminar
              </Button>
            )}
            {!address.isDefault && onSetDefault && (
              <Button 
                variant="ghost" 
                size="sm" 
                leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                onClick={(e) => { e.stopPropagation(); onSetDefault(address.id); }}
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

export interface AddressListProps {
  addresses: Address[];
  selectedId?: string | null;
  onSelect: (address: Address) => void;
  onAdd: () => void;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  emptyState?: {
    title: string;
    description: string;
    actionLabel: string;
  };
}

export function AddressList({ 
  addresses, 
  selectedId, 
  onSelect, 
  onAdd, 
  onEdit, 
  onDelete, 
  onSetDefault,
  emptyState = {
    title: "No tienes direcciones guardadas",
    description: "Agrega una dirección para facilitar tus próximos pedidos",
    actionLabel: "Agregar dirección"
  }
}: AddressListProps) {
  if (addresses.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="font-semibold">{emptyState.title}</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{emptyState.description}</p>
        <Button variant="primary" size="md" onClick={onAdd} className="mt-4">
          {emptyState.actionLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="list" aria-label="Direcciones guardadas">
      {addresses.map((address) => (
        <AddressCard
          key={address.id}
          address={address}
          isSelected={address.id === selectedId}
          onSelect={() => onSelect(address)}
          onEdit={() => onEdit(address)}
          onDelete={() => onDelete(address.id)}
          onSetDefault={() => onSetDefault(address.id)}
        />
      ))}
      <Button variant="outline" fullWidth onClick={onAdd} className="mt-2">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Agregar otra dirección
      </Button>
    </div>
  );
}