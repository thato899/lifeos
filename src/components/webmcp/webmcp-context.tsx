"use client";

import { createContext, useContext } from "react";

export type WebmcpStatus = "unsupported" | "loading" | "ready" | "error";

export interface WebmcpState {
  status: WebmcpStatus;
  toolCount: number;
}

export const WebmcpContext = createContext<WebmcpState>({
  status: "loading",
  toolCount: 0,
});

export function useWebmcpStatus() {
  return useContext(WebmcpContext);
}
