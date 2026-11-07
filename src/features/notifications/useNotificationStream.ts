import { useEffect, useRef } from "react";
import { getAccessToken, refreshSession } from "@/lib/session";
import { queryKeys, useReload } from "@/lib/query";
import type { Notification } from "./api";

const STREAM_URL = "/api/v1/notifications/stream";
// Waits before trying again: short after a normal end (the token's life is up), longer after a failure.
const AFTER_END_MS = 1_000;
const AFTER_FAILURE_MS = 15_000;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

// Splits a Server-Sent Events text stream into { event, data } pairs. Heartbeat comments are skipped.
const parseEvent = (block: string) => {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  return data.length ? { event, data: data.join("\n") } : null;
};

// Listens for new notifications while the app is open. The stream needs the Bearer header, which
// EventSource can't send, so it's read with fetch. It ends when the access token does; this opens
// a new one with the fresh token.
export const useNotificationStream = (onNotification: (notification: Notification) => void) => {
  const reload = useReload();
  const handler = useRef(onNotification);
  useEffect(() => {
    handler.current = onNotification;
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const listen = async () => {
      const token = getAccessToken();
      if (!token) return AFTER_FAILURE_MS;
      const response = await fetch(STREAM_URL, { headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" }, signal });
      if (response.status === 401) return (await refreshSession()) ? 0 : AFTER_FAILURE_MS;
      if (!response.ok || !response.body) return AFTER_FAILURE_MS;
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return AFTER_END_MS;
        buffer += value.replace(/\r\n/g, "\n");
        let split = buffer.indexOf("\n\n");
        while (split !== -1) {
          const parsed = parseEvent(buffer.slice(0, split));
          buffer = buffer.slice(split + 2);
          split = buffer.indexOf("\n\n");
          if (parsed?.event === "connected") void reload(queryKeys.notifications);
          if (parsed?.event === "notification") {
            void reload(queryKeys.notifications);
            try {
              handler.current(JSON.parse(parsed.data) as Notification);
            } catch {
              // A message that isn't JSON is ignored; the list reload still shows it.
            }
          }
        }
      }
    };

    void (async () => {
      while (!signal.aborted) {
        const pause = await listen().catch(() => AFTER_FAILURE_MS);
        if (!signal.aborted && pause) await wait(pause, signal);
      }
    })();
    return () => controller.abort();
  }, [reload]);
};
