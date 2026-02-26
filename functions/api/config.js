export async function onRequestGet({ env }) {
    const stripePublishableKey = env.STRIPE_PUBLISHABLE_KEY;
    const priceId = env.PRICE_ID;

    if (!stripePublishableKey || !priceId) {
        return Response.json(
            { error: "Missing STRIPE_PUBLISHABLE_KEY or PRICE_ID" },
            { status: 500 }
        );
    }

    return Response.json({
        stripePublishableKey,
        priceId,
    });
}