// src/hooks/useLiveEvents.js
import { useEffect } from "react";

export function useLiveEvents(onEvent) {
  useEffect(() => {
    const wsUrl =
      import.meta.env.VITE_API_WS_URL || "ws://127.0.0.1:8000/ws/events";

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      // optional: send a ping so backend's receive_text() doesn't complain
      ws.send("subscribe");
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === "new_event") {
          onEvent(payload.data);
        }
      } catch (err) {
        console.error("WS parse error", err);
      }
    };

    ws.onclose = () => {
      console.log("❌ WebSocket closed");
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };

    return () => {
      ws.close();
    };
  }, [onEvent]);
}
