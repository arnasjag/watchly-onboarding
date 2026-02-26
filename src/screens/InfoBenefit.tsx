import type { InfoBenefitStep } from "../types/flow";
import { StepLayout } from "../components/StepLayout";
import styles from "./InfoBenefit.module.css";

interface Props {
  step: InfoBenefitStep;
  onNext: (answer?: string | string[]) => void;
  onBack: () => void;
  resolveText: (base: string, variants?: Record<string, string>) => string;
  progress: number;
  canGoBack: boolean;
}

export function InfoBenefit({
  step,
  onNext,
  onBack,
  resolveText,
  progress,
  canGoBack,
}: Props) {
  return (
    <StepLayout
      title={resolveText(step.title, step.title_variants)}
      subtitle={
        step.subtitle
          ? resolveText(step.subtitle, step.subtitle_variants)
          : undefined
      }
      progress={progress}
      canGoBack={canGoBack}
      onBack={onBack}
      ctaLabel={resolveText(step.ctaLabel, step.ctaLabel_variants)}
      onCTA={() => onNext()}
    >
      <div className={styles.benefits}>
        {step.benefits.map((benefit, i) => (
          <div
            key={i}
            className={styles.benefit}
            style={{ animationDelay: `${i * 100 + 200}ms` }}
          >
            <div className={styles.checkIcon}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 10l3.5 3.5L15 7"
                  stroke="var(--color-accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span>{benefit}</span>
          </div>
        ))}
      </div>
    </StepLayout>
  );
}
