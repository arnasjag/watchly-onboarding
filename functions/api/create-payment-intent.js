export async function onRequestPost(context) {
    const { STRIPE_SECRET_KEY } = context.env;

    const { priceId } = await context.request.json();
    if (!priceId) {
        return new Response(JSON.stringify({ error: "priceId required" }), {
            status: 400,
        });
    }

    const priceRes = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
        headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        },
    });
    const price = await priceRes.json();

    const amount = price.unit_amount;

    const form = new URLSearchParams();
    form.set("amount", String(amount));
    form.set("currency", price.currency);
    form.set("payment_method_types[0]", "card");
    form.set("setup_future_usage", "off_session");

    const piRes = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
    });

    const pi = await piRes.json();

    return new Response(
        JSON.stringify({
            clientSecret: pi.client_secret,
            amount,
        }),
        { headers: { "Content-Type": "application/json" } }
    );
}
