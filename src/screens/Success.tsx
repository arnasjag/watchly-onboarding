import type { SuccessStep } from "../types/flow";
import { StepLayout } from "../components/StepLayout";
import styles from "./Success.module.css";

interface Props {
  step: SuccessStep;
  onNext: (answer?: string | string[]) => void;
  onBack: () => void;
  resolveText: (base: string, variants?: Record<string, string>) => string;
  progress: number;
  canGoBack: boolean;
}

export function Success({
  step,
  onNext,
  onBack,
  resolveText,
  progress,
  canGoBack,
}: Props) {
  const handleOpenApp = () => {
    // Check for payment_intent in URL for deep link
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const paymentIntent =
      params.get("payment_intent") ||
      new URLSearchParams(hash.split("?")[1] || "").get("payment_intent");

    if (paymentIntent) {
      window.location.href = `/api/open-app-link?payment_intent=${paymentIntent}`;
    } else {
      onNext();
    }
  };

  return (
    <StepLayout
      title={resolveText(step.title, step.title_variants)}
      progress={1}
      canGoBack={false}
      onBack={onBack}
      ctaLabel={resolveText(step.ctaLabel, step.ctaLabel_variants)}
      onCTA={handleOpenApp}
    >
      <div className={styles.content}>
        <div className={styles.checkCircle}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle
              cx="24"
              cy="24"
              r="22"
              stroke="var(--color-accent)"
              strokeWidth="2"
              opacity="0.3"
            />
            <path
              d="M14 24l7 7 13-13"
              stroke="var(--color-accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className={styles.message}>{step.message}</p>
      </div>
    </StepLayout>
  );
}
