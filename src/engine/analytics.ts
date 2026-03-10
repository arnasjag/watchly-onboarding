import posthog from "../lib/posthog";

export type EventType =
  | "flow_started"
  | "step_viewed"
  | "step_completed"
  | "step_back"
  | "flow_completed"
  | "payment_started"
  | "payment_success"
  | "payment_error";

export interface AnalyticsEvent {
  type: EventType;
  flowId: string;
  stepId: string;
  timestamp: number;
  variant?: string;
  answer?: string | string[];
  metadata?: Record<string, unknown>;
}

const QUEUE_KEY = "analytics:queue";
let queue: AnalyticsEvent[] = [];

try {
  const saved = localStorage.getItem(QUEUE_KEY);
  if (saved) queue = JSON.parse(saved);
} catch {
  /* ignore */
}

export function track(event: AnalyticsEvent): void {
  queue.push(event);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  posthog.capture(event.type, {
    flow_id: event.flowId,
    step_id: event.stepId,
    ...(event.variant && { variant: event.variant }),
    ...(event.answer && { answer: event.answer }),
    ...event.metadata,
  });

  if (import.meta.env.DEV) {
    console.log(
      `%c[analytics] ${event.type}`,
      "color: #96fe00; font-weight: bold",
      event.stepId,
      event.answer ?? "",
    );
  }
}

export async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = [...queue];
  queue = [];
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  if (!endpoint) return;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
    });
  } catch {
    queue = [...batch, ...queue];
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

// Flush on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
    if (endpoint && queue.length > 0) {
      navigator.sendBeacon(endpoint, JSON.stringify({ events: queue }));
    }
  });
}
