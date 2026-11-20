const CANCELLATION_BLOCK_MESSAGE =
  "El vendedor ya confirmó este pedido. Ya no se puede cancelar. Si necesitas ayuda, contacta a la tienda.";

export function getCancellationBlockMessage(status: string): string | null {
  if (status === "PENDING") return null;
  if (status === "CANCELLED") return "Este pedido ya fue cancelado.";
  if (status === "COMPLETED") return "No se puede cancelar un pedido entregado.";
  return CANCELLATION_BLOCK_MESSAGE;
}

export function getStaffCancellationBlockMessage(status: string): string | null {
  if (status === "CANCELLED") return "Este pedido ya fue cancelado.";
  if (status === "COMPLETED") return "No se puede cancelar un pedido entregado.";
  return null;
}

export function requiresCancellationReason(status: string): boolean {
  return status !== "PENDING";
}

export function canCancelOrder(status: string): boolean {
  return getCancellationBlockMessage(status) === null;
}
