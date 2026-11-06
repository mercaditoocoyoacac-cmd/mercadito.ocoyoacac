import { Capacitor, registerPlugin } from "@capacitor/core";

export interface FloatingBubbleState {
  supported: boolean;
  granted: boolean;
  enabled: boolean;
}

interface FloatingBubblePlugin {
  isSupported(): Promise<{ supported: boolean }>;
  hasPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  show(options: { count: number; title: string; body: string; url: string }): Promise<void>;
  hide(): Promise<void>;
  getState(): Promise<{ running: boolean; count: number }>;
}

const FloatingBubble = registerPlugin<FloatingBubblePlugin>("FloatingBubble");
const STORAGE_KEY = "mo_floating_bubble";

export function isFloatingBubbleAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export function isFloatingBubbleEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setFloatingBubbleEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {}
}

export async function readFloatingBubbleState(): Promise<FloatingBubbleState> {
  const state: FloatingBubbleState = {
    supported: false,
    granted: false,
    enabled: isFloatingBubbleEnabled(),
  };
  if (!isFloatingBubbleAvailable()) {
    return state;
  }
  try {
    const support = await FloatingBubble.isSupported();
    state.supported = support.supported === true;
    if (!state.supported) {
      return state;
    }
    const permission = await FloatingBubble.hasPermission();
    state.granted = permission.granted === true;
  } catch {}
  return state;
}

export async function requestFloatingBubblePermission(): Promise<boolean> {
  if (!isFloatingBubbleAvailable()) {
    return false;
  }
  try {
    const result = await FloatingBubble.requestPermission();
    return result.granted === true;
  } catch {
    return false;
  }
}

export async function hideFloatingBubble(): Promise<void> {
  if (!isFloatingBubbleAvailable()) {
    return;
  }
  try {
    await FloatingBubble.hide();
  } catch {}
}

function absoluteUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value.startsWith("/")) {
    return `${window.location.origin}${value}`;
  }
  return value;
}

export async function syncFloatingBubble(payload?: {
  count?: number;
  title?: string;
  body?: string;
  url?: string;
}): Promise<void> {
  if (!isFloatingBubbleAvailable() || !isFloatingBubbleEnabled()) {
    return;
  }
  try {
    const permission = await FloatingBubble.hasPermission();
    if (!permission.granted) {
      return;
    }

    let count = payload?.count;
    if (count === undefined) {
      const response = await fetch("/api/notifications/count", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      count = typeof data.count === "number" ? data.count : 0;
    }

    if (!count || count <= 0) {
      await FloatingBubble.hide();
      return;
    }

    await FloatingBubble.show({
      count,
      title: payload?.title || "Pedidos pendientes",
      body: payload?.body || "",
      url: absoluteUrl(payload?.url) || `${window.location.origin}/notificaciones`,
    });
  } catch {}
}
