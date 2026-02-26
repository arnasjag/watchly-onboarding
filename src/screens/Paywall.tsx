import { useState, useEffect, useRef } from "react";
import type { PaywallStep } from "../types/flow";
import { StepLayout } from "../components/StepLayout";
import { track } from "../engine/analytics";
import styles from "./Paywall.module.css";

interface Props {
  step: PaywallStep;
  onNext: (answer?: string | string[]) => void;
  onBack: () => void;
  resolveText: (base: string, variants?: Record<string, string>) => string;
  progress: number;
  canGoBack: boolean;
  flowId: string;
}

export function Paywall({
  step,
  onNext,
  onBack,
  resolveText,
  progress,
  canGoBack,
  flowId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    initStripe();
  }, []);

  async function initStripe() {
    try {
      // Dynamic import of Stripe
      const { loadStripe } = await import("@stripe/stripe-js");

      // Get config
      const configRes = await fetch("/api/config");
      if (!configRes.ok) throw new Error("Failed to load config");
      const config = await configRes.json();

      // Create subscription
      const subRes = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: config.priceId }),
      });
      if (!subRes.ok) throw new Error("Failed to create subscription");
      const { clientSecret } = await subRes.json();

      // Init Stripe
      const stripe = await loadStripe(config.stripePublishableKey);
      if (!stripe) throw new Error("Stripe failed to load");

      stripeRef.current = stripe;
      const elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#96fe00",
            colorBackground: "rgba(255, 255, 255, 0.06)",
            colorText: "#ffffff",
            colorTextSecondary: "rgba(255, 255, 255, 0.6)",
            borderRadius: "12px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          },
          rules: {
            ".Input": {
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "none",
            },
            ".Input:focus": {
              border: "1px solid rgba(150, 254, 0, 0.5)",
              boxShadow: "0 0 0 1px rgba(150, 254, 0, 0.2)",
            },
          },
        },
      });
      elementsRef.current = elements;

      const paymentEl = elements.create("payment");
      const container = document.getElementById("payment-element");
      if (container) paymentEl.mount(container);

      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Payment setup failed");
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!stripeRef.current || !elementsRef.current) return;

    setLoading(true);
    track({
      type: "payment_started",
      flowId,
      stepId: step.id,
      timestamp: Date.now(),
    });

    const returnUrl = `${window.location.origin}${window.location.pathname}#/step/success`;

    const { error } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: { return_url: returnUrl },
    });

    if (error) {
      setError(error.message || "Payment failed");
      setLoading(false);
      track({
        type: "payment_error",
        flowId,
        stepId: step.id,
        timestamp: Date.now(),
        metadata: { error: error.message },
      });
    } else {
      track({
        type: "payment_success",
        flowId,
        stepId: step.id,
        timestamp: Date.now(),
      });
      onNext();
    }
  }

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
      ctaLabel={
        loading
          ? "Loading..."
          : resolveText(step.ctaLabel, step.ctaLabel_variants)
      }
      ctaDisabled={loading}
      onCTA={handleSubmit}
    >
      <div className={styles.content}>
        {step.features && (
          <div className={styles.features}>
            {step.features.map((f, i) => (
              <div key={i} className={styles.feature}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 8l2.5 2.5L12 5"
                    stroke="var(--color-accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{f}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.paymentContainer}>
          <div id="payment-element" className={styles.stripeElement} />
          {loading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <span>Setting up secure payment...</span>
            </div>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </StepLayout>
  );
}
