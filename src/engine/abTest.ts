const PREFIX = "ab:variant:";

export function getOrAssignVariant(flowId: string): string {
  const key = `${PREFIX}${flowId}`;
  const stored = localStorage.getItem(key);
  if (stored) return stored;

  const variant = Math.random() < 0.5 ? "A" : "B";
  localStorage.setItem(key, variant);
  return variant;
}
