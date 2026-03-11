import posthog from "../lib/posthog";

const PREFIX = "ab:variant:";
const FLAG_NAME = "onboarding-cta-variant";

export function getOrAssignVariant(flowId: string): string {
  const key = `${PREFIX}${flowId}`;
  const stored = localStorage.getItem(key);
  if (stored) return stored;

  // PostHog returns cached flag value instantly if available from previous session.
  // Returns undefined if flags haven't loaded yet (first-time visitors).
  // Automatically sends $feature_flag_called event.
  const flag = posthog.getFeatureFlag(FLAG_NAME);
  if (flag === "A" || flag === "B") {
    localStorage.setItem(key, flag);
    return flag;
  }

  // Fallback for first-time visitors before PostHog flags load
  const variant = Math.random() < 0.5 ? "A" : "B";
  localStorage.setItem(key, variant);
  return variant;
}
