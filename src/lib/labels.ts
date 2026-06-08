export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "En preparación",
  READY: "Listo para recoger",
  OUT_FOR_DELIVERY: "Repartidor en camino",
  COMPLETED: "Entregado",
  CANCELLED: "Cancelado",
};

export function getStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] || status;
}

export const FULFILLMENT_LABELS: Record<string, string> = {
  PICKUP: "Recoger en tienda",
  DELIVERY: "Entrega a domicilio",
};
