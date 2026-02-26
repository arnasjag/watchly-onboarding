import { useState, useCallback } from "react";
import type { SingleChoiceStep } from "../types/flow";
import { StepLayout } from "../components/StepLayout";
import styles from "./SingleChoice.module.css";

interface Props {
  step: SingleChoiceStep;
  onNext: (answer?: string | string[]) => void;
  onBack: () => void;
  resolveText: (base: string, variants?: Record<string, string>) => string;
  progress: number;
  canGoBack: boolean;
}

export function SingleChoice({
  step,
  onNext,
  onBack,
  resolveText,
  progress,
  canGoBack,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = useCallback(
    (id: string) => {
      setSelected(id);
      // Auto-advance after brief highlight
      setTimeout(() => onNext(id), 300);
    },
    [onNext],
  );

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
      showCTA={false}
    >
      <div className={styles.options}>
        {step.options.map((opt, i) => (
          <button
            key={opt.id}
            className={`${styles.option} ${selected === opt.id ? styles.selected : ""}`}
            onClick={() => handleSelect(opt.id)}
            style={{ animationDelay: `${i * 60 + 100}ms` }}
          >
            {opt.emoji && <span className={styles.emoji}>{opt.emoji}</span>}
            <div className={styles.label}>
              <span className={styles.labelText}>{opt.label}</span>
              {opt.description && (
                <span className={styles.desc}>{opt.description}</span>
              )}
            </div>
            <div className={styles.radio}>
              {selected === opt.id && <div className={styles.radioFill} />}
            </div>
          </button>
        ))}
      </div>
    </StepLayout>
  );
}
