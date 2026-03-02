import { useState, useEffect, useRef } from "react";
import type { LoadingStep } from "../types/flow";
import { StepLayout } from "../components/StepLayout";
import styles from "./Loading.module.css";
import { preloadStripeBootstrap } from "../lib/stripeBootstrap";

interface Props {
  step: LoadingStep;
  onNext: (answer?: string | string[]) => void;
  onBack: () => void;
  resolveText: (base: string, variants?: Record<string, string>) => string;
  progress: number;
  canGoBack: boolean;
}

export function Loading({
  step,
  onNext,
  onBack,
  resolveText,
  progress,
  canGoBack,
}: Props) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const called = useRef(false);

    useEffect(() => {
        preloadStripeBootstrap().catch((e) => {
            console.error("Stripe preload failed:", e);
        });
    }, []);

  useEffect(() => {
    const interval = step.duration / step.messages.length;
    const timer = setInterval(() => {
      setMsgIndex((prev) => Math.min(prev + 1, step.messages.length - 1));
    }, interval);
    return () => clearInterval(timer);
  }, [step.duration, step.messages.length]);

  useEffect(() => {
    const start = Date.now();
    const frame = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / step.duration, 1);
      setLoadProgress(pct);
      if (pct < 1) {
        requestAnimationFrame(frame);
      } else if (!called.current) {
        called.current = true;
        setTimeout(() => onNext(), 400);
      }
    };
    requestAnimationFrame(frame);
  }, [step.duration, onNext]);

  return (
    <StepLayout
      title={resolveText(step.title, step.title_variants)}
      progress={progress}
      canGoBack={canGoBack}
      onBack={onBack}
      showCTA={false}
    >
      <div className={styles.content}>
        <div className={styles.loader}>
          <div className={styles.loaderTrack}>
            <div
              className={styles.loaderFill}
              style={{ width: `${Math.round(loadProgress * 100)}%` }}
            />
          </div>
          <span className={styles.pct}>{Math.round(loadProgress * 100)}%</span>
        </div>
        <p className={styles.message} key={msgIndex}>
          {step.messages[msgIndex]}
        </p>
      </div>
    </StepLayout>
  );
}
