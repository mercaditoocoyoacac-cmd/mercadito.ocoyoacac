"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { formatDateTimeInMexico } from "@/lib/dates";
import { Button } from "./Button";

export type OrderStatus = 
  | "PENDING" 
  | "CONFIRMED" 
  | "READY" 
  | "OUT_FOR_DELIVERY" 
  | "COMPLETED" 
  | "CANCELLED";

const statusConfig: Record<OrderStatus, { label: string; icon: ReactNode; color: string; description: string }> = {
  PENDING: { 
    label: "Pendiente", 
    icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    color: "#f59e0b",
    description: "Tu pedido ha sido recibido y está esperando confirmación"
  },
  CONFIRMED: { 
    label: "Confirmado", 
    icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    color: "#3b82f6",
    description: "La tienda ha confirmado tu pedido y lo está preparando"
  },
  READY: { 
    label: "Listo para entregar", 
    icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    color: "#8b5cf6",
    description: "Tu pedido está listo para ser recogido o enviado"
  },
  OUT_FOR_DELIVERY: { 
    label: "En camino", 
    icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
    color: "#f97316",
    description: "El repartidor está en camino con tu pedido"
  },
  COMPLETED: { 
    label: "Completado", 
    icon: <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>,
    color: "#10b981",
    description: "Tu pedido ha sido entregado exitosamente"
  },
  CANCELLED: { 
    label: "Cancelado", 
    icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
    color: "#ef4444",
    description: "El pedido ha sido cancelado"
  },
};

const statusOrder: OrderStatus[] = [
  "PENDING", 
  "CONFIRMED", 
  "READY", 
  "OUT_FOR_DELIVERY", 
  "COMPLETED"
];

export interface OrderTimelineData {
  status: OrderStatus;
  timestamps: Partial<Record<OrderStatus, string>>;
  currentStatus: OrderStatus;
  fulfillmentType: "PICKUP" | "DELIVERY";
  pickupCode?: string;
  deliveryAddress?: string;
  storeName?: string;
  storePhone?: string;
  driverName?: string;
  driverPhone?: string;
  driverLocation?: { lat: number; lng: number };
  estimatedDelivery?: string;
}

export interface OrderTimelineProps {
  data: OrderTimelineData;
  variant?: "default" | "compact" | "card";
  className?: string;
  showDescriptions?: boolean;
  onContactStore?: () => void;
  onContactDriver?: () => void;
  onTrackDriver?: () => void;
}

export function OrderTimeline({ 
  data, 
  variant = "default", 
  className = "", 
  showDescriptions = true,
  onContactStore,
  onContactDriver,
  onTrackDriver
}: OrderTimelineProps) {
  const { currentStatus, timestamps, fulfillmentType, pickupCode, deliveryAddress, storeName, storePhone, driverName, driverPhone, driverLocation, estimatedDelivery } = data;
  const currentIndex = statusOrder.indexOf(currentStatus);
  const isCompleted = currentStatus === "COMPLETED";
  const isCancelled = currentStatus === "CANCELLED";

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 overflow-x-auto pb-2 ${className}`}
        role="list"
        aria-label="Estado del pedido"
      >
        {statusOrder.slice(0, isCancelled ? 1 : (isCompleted ? 5 : currentIndex + 1)).map((status, index) => {
          const config = statusConfig[status];
          const isActive = index === currentIndex && !isCompleted && !isCancelled;
          const isPast = index < currentIndex;
          const isFuture = index > currentIndex;
          
          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
              role="listitem"
            >
              <div className={`
                relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300
                ${isPast ? `bg-${getColorName(config.color)} border-${getColorName(config.color)} text-white` : ""}
                ${isActive ? `border-${getColorName(config.color)} text-${getColorName(config.color)} bg-white ring-4 ring-${getColorName(config.color)}/20` : ""}
                ${isFuture ? "border-gray-300 text-gray-400 bg-white" : ""}
              `}>
                {isPast ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  config.icon
                )}
              </div>
              <span className={`
                text-xs font-medium text-center max-w-[70px] truncate
                ${isActive ? "text-[var(--foreground)]" : isPast ? "text-gray-600" : "text-gray-400"}
              `}>
                {config.label}
              </span>
              {isActive && timestamps[status] && (
                <span className="text-[10px] text-[color:var(--muted)] whitespace-nowrap">
                  {formatDateTimeInMexico(new Date(timestamps[status]!), { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    );
  }

  if (variant === "card") {
    return (
      <div className={`space-y-4 ${className}`} role="list" aria-label="Timeline del pedido">
        {statusOrder.slice(0, isCancelled ? 1 : (isCompleted ? 5 : currentIndex + 1)).map((status, index) => {
          const config = statusConfig[status];
          const isActive = index === currentIndex && !isCompleted && !isCancelled;
          const isPast = index < currentIndex;
          const isFuture = index > currentIndex;
          const timestamp = timestamps[status];
          
          return (
            <motion.div
              key={status}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex gap-4"
              role="listitem"
            >
              <div className="relative flex flex-col items-center flex-shrink-0">
                <div className={`
                  flex h-12 w-12 items-center justify-center rounded-full border-3 transition-all duration-300 z-10
                  ${isPast ? `bg-${getColorName(config.color)} border-${getColorName(config.color)} text-white shadow-lg` : ""}
                  ${isActive ? `border-${getColorName(config.color)} text-${getColorName(config.color)} bg-white ring-4 ring-${getColorName(config.color)}/30 shadow-lg` : ""}
                  ${isFuture ? "border-gray-200 text-gray-300 bg-white" : ""}
                `}>
                  {isPast ? (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    config.icon
                  )}
                </div>
                {index < statusOrder.length - 1 && (
                  <div className={`
                    absolute left-5 top-12 bottom-12 w-px
                    ${isPast ? `bg-${getColorName(config.color)}` : "bg-gray-200"}
                  `} aria-hidden="true" />
                )}
              </div>
              
              <div className={`flex-1 ${isActive ? "ring-2 ring-[var(--accent)]/20 rounded-xl bg-[var(--accent-soft)]/50 p-4" : "p-4"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className={`
                      font-semibold text-base
                      ${isActive ? "text-[var(--foreground)]" : isPast ? "text-gray-700" : "text-gray-400"}
                    `}>
                      {config.label}
                    </h4>
                    {showDescriptions && (
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{config.description}</p>
                    )}
                    {timestamp && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <svg className="h-4 w-4 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[color:var(--muted)]">
                          {formatDateTimeInMexico(new Date(timestamp), { 
                            day: "numeric", 
                            month: "short", 
                            hour: "2-digit", 
                            minute: "2-digit" 
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {isActive && (
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {fulfillmentType === "PICKUP" && pickupCode && (
                        <div className="text-center p-3 rounded-xl bg-white border border-[var(--border)] shadow-sm">
                          <p className="text-xs text-[color:var(--muted)]">Código de recogida</p>
                          <code className="font-mono text-xl font-bold tracking-widest text-[var(--accent)]">{pickupCode}</code>
                          <p className="text-[10px] text-[color:var(--muted)] mt-1">Muestra este código al recoger</p>
                        </div>
                      )}
                      {fulfillmentType === "DELIVERY" && (
                        <div className="flex flex-col items-end gap-1">
                          {estimatedDelivery && (
                            <div className="text-right">
                              <p className="text-xs text-[color:var(--muted)]">Entrega estimada</p>
                              <p className="font-medium text-[var(--accent)]">{estimatedDelivery}</p>
                            </div>
                          )}
                          {driverName && (
                            <Button variant="outline" size="sm" leftIcon={
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            } onClick={onTrackDriver}>
                              Ver repartidor
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`} role="list" aria-label="Timeline del pedido">
      {statusOrder.slice(0, isCancelled ? 1 : (isCompleted ? 5 : currentIndex + 1)).map((status, index) => {
        const config = statusConfig[status];
        const isActive = index === currentIndex && !isCompleted && !isCancelled;
        const isPast = index < currentIndex;
        const isFuture = index > currentIndex;
        const timestamp = timestamps[status];
        
        return (
          <motion.div
            key={status}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="flex gap-4"
            role="listitem"
          >
            <div className="relative flex flex-col items-center flex-shrink-0">
              <div className={`
                flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300
                ${isPast ? `bg-${getColorName(config.color)} border-${getColorName(config.color)} text-white` : ""}
                ${isActive ? `border-${getColorName(config.color)} text-${getColorName(config.color)} bg-white ring-4 ring-${getColorName(config.color)}/20` : ""}
                ${isFuture ? "border-gray-300 text-gray-400 bg-white" : ""}
              `}>
                {isPast ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  config.icon
                )}
              </div>
              {index < statusOrder.length - 1 && (
                <div className={`
                  absolute left-4 top-10 bottom-10 w-px
                  ${isPast ? `bg-${getColorName(config.color)}` : "bg-gray-200"}
                `} aria-hidden="true" />
              )}
            </div>
            
            <div className={`flex-1 min-w-0 ${isActive ? "bg-[var(--accent-soft)]/50 rounded-xl p-3" : "p-3"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`
                      font-semibold text-sm
                      ${isActive ? "text-[var(--foreground)]" : isPast ? "text-gray-700" : "text-gray-400"}
                    `}>
                      {config.label}
                    </h4>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                        Actual
                      </span>
                    )}
                  </div>
                  {showDescriptions && (
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{config.description}</p>
                  )}
                  {timestamp && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                      <svg className="h-3.5 w-3.5 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[color:var(--muted)]">
                        {formatDateTimeInMexico(new Date(timestamp), { 
                          day: "numeric", 
                          month: "short", 
                          hour: "2-digit", 
                          minute: "2-digit" 
                        })}
                      </span>
                    </div>
                  )}
                </div>
                
                {isActive && fulfillmentType === "PICKUP" && pickupCode && (
                  <div className="shrink-0 ml-4 text-center p-3 rounded-xl bg-white border border-[var(--border)] shadow-sm">
                    <p className="text-[10px] text-[color:var(--muted)] uppercase tracking-wide">Código recogida</p>
                    <code className="font-mono text-lg font-bold tracking-wider text-[var(--accent)] block">{pickupCode}</code>
                    <p className="text-[10px] text-[color:var(--muted)] mt-1">Al recoger en tienda</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function getColorName(hex: string): string {
  const colors: Record<string, string> = {
    "#f59e0b": "amber-500",
    "#3b82f6": "blue-500",
    "#8b5cf6": "purple-500",
    "#f97316": "orange-500",
    "#10b981": "emerald-500",
    "#ef4444": "red-500",
  };
  return colors[hex] || "gray-500";
}

export function OrderStatusBadge({ 
  status, 
  size = "md" 
}: { 
  status: OrderStatus; 
  size?: "sm" | "md" | "lg"; 
}) {
  const config = statusConfig[status];
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]}`} style={{ backgroundColor: `${config.color}15`, color: config.color }}>
      <span style={{ color: config.color }}>{config.icon}</span>
      {config.label}
    </span>
  );
}

export function OrderProgressRing({ 
  currentStatus, 
  size = 80, 
  strokeWidth = 6 
}: { 
  currentStatus: OrderStatus; 
  size?: number; 
  strokeWidth?: number; 
}) {
  const currentIndex = statusOrder.indexOf(currentStatus);
  const totalSteps = statusOrder.length;
  const progress = currentIndex / (totalSteps - 1);
  const circumference = Math.PI * (size - strokeWidth);
  const offset = circumference * (1 - progress);
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg style={{ width: size, height: size, transform: "rotate(-90deg)" }} viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={50 - strokeWidth / 2}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth / (size / 100)}
        />
        <motion.circle
          cx="50"
          cy="50"
          r={50 - strokeWidth / 2}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth={strokeWidth / (size / 100)}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="25%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">
        <span className="text-2xl font-bold text-[var(--foreground)]">{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
}