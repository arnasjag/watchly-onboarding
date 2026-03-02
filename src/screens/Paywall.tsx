import { useState, useEffect, useRef } from "react";
import type { PaywallStep } from "../types/flow";
import { StepLayout } from "../components/StepLayout";
import { track } from "../engine/analytics";
import styles from "./Paywall.module.css";
import { preloadStripeBootstrap, getStripeBootstrap, hasStripeBootstrap } from "../lib/stripeBootstrap";

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
  const [expressReady, setExpressReady] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const mountedRef = useRef(false);
  const paymentElementRef = useRef<any>(null);

    const handledRedirectRef = useRef(false);



  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    initStripe();
  }, []);

    useEffect(() => {
        if (!showCardForm) return;

        const elements = elementsRef.current;
        if (!elements) return;

        if (!paymentElementRef.current) {
            paymentElementRef.current = elements.create("payment", { layout: "tabs" });
        }

        const paymentElement = paymentElementRef.current;
        const container = document.getElementById("payment-element");

        if (paymentElement && container && !container.hasChildNodes()) {
            paymentElement.mount(container);
        }
    }, [showCardForm]);

    useEffect(() => {
        if (handledRedirectRef.current) return;

        const params = new URLSearchParams(window.location.search);
        const redirectStatus = params.get("redirect_status");
        if (redirectStatus !== "succeeded") return;

        handledRedirectRef.current = true;

        window.history.replaceState({}, "", `${window.location.origin}`);

        queueMicrotask(() => {
            onNext();
        });
    }, [onNext]);

  async function initStripe() {
    try {
        if (!hasStripeBootstrap()) {
            await preloadStripeBootstrap();
        }

        const { stripe, elements, state } = getStripeBootstrap();

        stripeRef.current = stripe;
        elementsRef.current = elements;

        // Express Checkout создаём и монтируем уже здесь (DOM контейнер есть)
        const expressCheckoutEl = elements.create("expressCheckout", {
            emailRequired: true,
        });

        const expressContainer = document.getElementById("express-checkout");
        if (expressContainer && !expressContainer.hasChildNodes()) {
            expressCheckoutEl.mount(expressContainer);
        }

        expressCheckoutEl.on("ready", ({ availablePaymentMethods }: any) => {
            if (availablePaymentMethods) setExpressReady(true);
        });

      expressCheckoutEl.on("confirm", async (event: any) => {
        try {
          setError(null);
          setLoading(true);

          track({
            type: "payment_started",
            flowId,
            stepId: step.id,
            timestamp: Date.now(),
            metadata: { method: "express_checkout" },
          });

          const { error: submitError } = await elements.submit();
          if (submitError) {
            setError(submitError.message || "Payment failed");
            event.complete("fail");
            setLoading(false);
            return;
          }

          const returnUrl = `${window.location.origin}#/step/success`;

          const { error: confirmError } = await stripe.confirmPayment({
            elements,
            clientSecret: state.clientSecret,
            confirmParams: { return_url: returnUrl },
          });

          if (confirmError) {
            setError(confirmError.message || "Payment failed");
            event.complete("fail");
            setLoading(false);
            track({
              type: "payment_error",
              flowId,
              stepId: step.id,
              timestamp: Date.now(),
              metadata: {
                error: confirmError.message,
                method: "express_checkout",
              },
            });
            return;
          }

          event.complete("success");
          track({
            type: "payment_success",
            flowId,
            stepId: step.id,
            timestamp: Date.now(),
            metadata: { method: "express_checkout" },
          });
          onNext();
        } catch (e: any) {
          setError("Payment failed");
          event.complete("fail");
          setLoading(false);
        }
      });

      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Payment setup failed");
      setLoading(false);
    }
  }

  async function handleCardSubmit() {
    if (!stripeRef.current || !elementsRef.current) return;

    setLoading(true);
    setError(null);

    track({
      type: "payment_started",
      flowId,
      stepId: step.id,
      timestamp: Date.now(),
      metadata: { method: "card" },
    });

    const returnUrl = `${window.location.origin}/#/step/success`;

    const { error: confirmError } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed");
      setLoading(false);
      track({
        type: "payment_error",
        flowId,
        stepId: step.id,
        timestamp: Date.now(),
        metadata: { error: confirmError.message, method: "card" },
      });
    } else {
      track({
        type: "payment_success",
        flowId,
        stepId: step.id,
        timestamp: Date.now(),
        metadata: { method: "card" },
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
      showCTA={false}
    >
      <div className={styles.content}>
        {/* Features list */}
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

        {/* Express Checkout (Apple Pay / Google Pay) — shown first */}
          <div className={styles.expressSlot}>
              <div id="express-checkout" className={styles.expressElement} />

              {/* Placeholder поверх, пока Stripe кнопку не подготовил */}
              {!expressReady && (
                  <button className={styles.expressPlaceholder} disabled>
                      {loading ? (
                          <span className={styles.loadingText}>
                              <span className={styles.spinnerInline} />
                              Setting up payment...
                            </span>
                      ) : (
                          <span>Pay</span>
                      )}
                  </button>
              )}
          </div>

        {/* Divider */}
        <div className={styles.divider}>
          <span>or</span>
        </div>

        {/* Credit Card toggle button */}
        {!showCardForm ? (
          <button
            className={styles.cardToggle}
            onClick={() => setShowCardForm(true)}
            disabled={loading}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="16" height="12" rx="2" />
              <path d="M2 8h16" />
            </svg>
            Credit or Debit Card
          </button>
        ) : (
          <div className={styles.cardSection}>
            <div className={styles.paymentContainer}>
              <div id="payment-element" className={styles.stripeElement} />
              {loading && (
                <div className={styles.loadingOverlay}>
                  <div className={styles.spinner} />
                  <span>Setting up secure payment...</span>
                </div>
              )}
            </div>

            <button
              className={styles.submitBtn}
              onClick={handleCardSubmit}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.loadingText}>
                  <span className={styles.spinnerInline} />
                  Processing...
                </span>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="2" width="10" height="14" rx="2" />
                    <circle cx="8" cy="10" r="1.5" />
                    <path d="M6 6V5a2 2 0 114 0v1" />
                  </svg>
                  {resolveText(step.ctaLabel, step.ctaLabel_variants)}
                </>
              )}
            </button>

            <div className={styles.guarantee}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="var(--color-text-muted)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="1" width="10" height="12" rx="2" />
                <circle cx="7" cy="8" r="1" />
                <path d="M5.5 5V4a1.5 1.5 0 013 0v1" />
              </svg>
              <span>Secured by Stripe. Cancel anytime.</span>
            </div>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </StepLayout>
  );
}
