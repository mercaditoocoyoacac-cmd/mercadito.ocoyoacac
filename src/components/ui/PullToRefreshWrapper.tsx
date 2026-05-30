"use client";

import { PullToRefresh } from "./PullToRefresh";

export function PullToRefreshWrapper({ children }: { children: React.ReactNode }) {
  return <PullToRefresh>{children}</PullToRefresh>;
}
