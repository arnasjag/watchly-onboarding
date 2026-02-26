import { type ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";
import styles from "./StepLayout.module.css";

interface Props {
  title: string;
  subtitle?: string;
  progress: number;
  canGoBack: boolean;
  onBack: () => void;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  onCTA?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  showCTA?: boolean;
  children: ReactNode;
}

export function StepLayout({
  title,
  subtitle,
  progress,
  canGoBack,
  onBack,
  ctaLabel,
  ctaDisabled = false,
  onCTA,
  secondaryLabel,
  onSecondary,
  showCTA = true,
  children,
}: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={onBack}
          style={{ visibility: canGoBack ? "visible" : "hidden" }}
          aria-label="Go back"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className={styles.progressWrap}>
          <ProgressBar progress={progress} />
        </div>
      </div>

      <div className={styles.titleArea}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.body}>{children}</div>

      {showCTA && ctaLabel && (
        <div className={styles.footer}>
          <button className={styles.cta} onClick={onCTA} disabled={ctaDisabled}>
            {ctaLabel}
          </button>
          {secondaryLabel && (
            <button className={styles.secondary} onClick={onSecondary}>
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
