// src/lib/stripeBootstrap.ts
import type { Stripe, StripeElements } from "@stripe/stripe-js";

type Config = {
    stripePublishableKey: string;
};

type State = {
    config: Config;
    clientSecret: string;
};

let inflight: Promise<void> | null = null;

let stripe: Stripe | null = null;
let elements: StripeElements | null = null;
let state: State | null = null;

export async function preloadStripeBootstrap(): Promise<void> {
    if (state && stripe && elements) return;
    if (inflight) return inflight;

    inflight = (async () => {
        const { loadStripe } = await import("@stripe/stripe-js");

        // 1) config
        const configRes = await fetch("/api/config");
        if (!configRes.ok) throw new Error("Failed to load payment config");
        const config = (await configRes.json()) as Config;

        // 2) subscription -> clientSecret
        const subRes = await fetch("/api/create-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        if (!subRes.ok) throw new Error("Failed to create subscription");
        const { clientSecret } = (await subRes.json()) as { clientSecret: string };

        // 3) stripe + elements
        const s = await loadStripe(config.stripePublishableKey);
        if (!s) throw new Error("Stripe failed to load");

        stripe = s;
        elements = s.elements({
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

        state = { config, clientSecret };
    })();

    try {
        await inflight;
    } finally {
        inflight = null;
    }
}

export function hasStripeBootstrap(): boolean {
    return !!(state && stripe && elements);
}

export function getStripeBootstrap() {
    if (!state || !stripe || !elements) {
        throw new Error("Stripe not preloaded yet. Call preloadStripeBootstrap() first.");
    }
    return { stripe, elements, state };
}

export function resetStripeBootstrap() {
    state = null;
    stripe = null;
    elements = null;
    inflight = null;
}