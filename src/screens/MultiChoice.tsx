import { useState, useCallback } from "react";
import type { MultiChoiceStep } from "../types/flow";
import { StepLayout } from "../components/StepLayout";
import styles from "./MultiChoice.module.css";

interface Props {
  step: MultiChoiceStep;
  onNext: (answer?: string | string[]) => void;
  onBack: () => void;
  resolveText: (base: string, variants?: Record<string, string>) => string;
  progress: number;
  canGoBack: boolean;
}

export function MultiChoice({
  step,
  onNext,
  onBack,
  resolveText,
  progress,
  canGoBack,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const min = step.minSelections ?? 0;

  const toggle = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (step.maxSelections && next.size >= step.maxSelections)
            return prev;
          next.add(id);
        }
        return next;
      });
    },
    [step.maxSelections],
  );

  const ctaLabel =
    selected.size > 0
      ? `${resolveText(step.ctaLabel, step.ctaLabel_variants)} (${selected.size})`
      : resolveText(step.ctaLabel, step.ctaLabel_variants);

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
      ctaLabel={ctaLabel}
      ctaDisabled={selected.size < min}
      onCTA={() => onNext(Array.from(selected))}
    >
      <div className={styles.chips}>
        {step.options.map((opt, i) => (
          <button
            key={opt.id}
            className={`${styles.chip} ${selected.has(opt.id) ? styles.selected : ""}`}
            onClick={() => toggle(opt.id)}
            style={{ animationDelay: `${i * 50 + 100}ms` }}
          >
            {opt.emoji && <span className={styles.emoji}>{opt.emoji}</span>}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </StepLayout>
  );
}
