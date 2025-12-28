// src/hooks/useLiveEvents.js
import { useEffect, useState } from "react";
import { API_WS_BASE } from "../services/api";

export function useLiveEvents() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Connect to WebSocket using dynamic URL
    const ws = new WebSocket(`${API_WS_BASE}/api/events/ws`);

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
