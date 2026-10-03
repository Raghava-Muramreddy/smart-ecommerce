/**
 * WebSocket client hook for real-time notifications.
 * Single connection per authenticated session.
 */
"use client";

import { useEffect, useRef, useCallback } from "react";
import { tokenStorage } from "@/lib/api/client";
import toast from "react-hot-toast";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT = 5;

type WSMessage = {
  type: string;
  title?: string;
  message?: string;
  data?: Record<string, any>;
};

let wsInstance: WebSocket | null = null;
let reconnectCount = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function useWebSocket(onMessage?: (msg: WSMessage) => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    const token = tokenStorage.getAccess();
    if (!token) return;
    if (wsInstance?.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}/ws/notifications?token=${encodeURIComponent(token)}`;
    wsInstance = new WebSocket(url);

    wsInstance.onopen = () => {
      reconnectCount = 0;
      console.log("[WS] Connected");
    };

    wsInstance.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        onMessageRef.current?.(msg);

        // Show toast for user-facing notifications
        if (msg.title && msg.type !== "CONNECTION_ESTABLISHED") {
          toast(msg.title, { icon: "🔔", duration: 4000 });
        }
      } catch {
        // Non-JSON messages (e.g., "pong")
      }
    };

    wsInstance.onclose = (event) => {
      console.log("[WS] Disconnected", event.code);
      if (reconnectCount < MAX_RECONNECT && event.code !== 1008) {
        reconnectTimer = setTimeout(() => {
          reconnectCount++;
          connect();
        }, RECONNECT_DELAY * reconnectCount);
      }
    };

    wsInstance.onerror = (error) => {
      console.warn("[WS] Error:", error);
    };

    // Keepalive ping
    const pingInterval = setInterval(() => {
      if (wsInstance?.readyState === WebSocket.OPEN) {
        wsInstance.send("ping");
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, []);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsInstance?.close();
      wsInstance = null;
    };
  }, [connect]);
}
