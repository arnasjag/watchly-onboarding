export async function onRequestPost(context) {
    const { STRIPE_SECRET_KEY } = context.env;

    const body = await context.request.json();
    const priceId = body.priceId;

    if (!priceId) {
        return new Response(JSON.stringify({ error: "priceId required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const customerForm = new URLSearchParams();
    const customerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: customerForm.toString(),
    });
    const customer = await customerRes.json();

    if (!customer.id) {
        return new Response(JSON.stringify({ error: "Cannot create customer", raw: customer }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    const userIp =
        context.request.headers.get("CF-Connecting-IP") ||
        context.request.headers.get("x-forwarded-for") ||
        null;


    const subForm = new URLSearchParams();
    subForm.set("customer", customer.id);
    subForm.set("items[0][price]", priceId);
    subForm.set("payment_behavior", "default_incomplete");
    subForm.set("payment_settings[save_default_payment_method]", "on_subscription");
    subForm.append("expand[]", "latest_invoice.payment_intent");
    if (userIp) {
        subForm.set("metadata[user_ip]", userIp);
    }


    const subRes = await fetch("https://api.stripe.com/v1/subscriptions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: subForm.toString(),
    });

    const subscription = await subRes.json();

    if (!subscription.latest_invoice || !subscription.latest_invoice.payment_intent) {
        return new Response(
            JSON.stringify({ error: "No payment_intent on subscription", raw: subscription }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }

    const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

    return new Response(
        JSON.stringify({
            subscriptionId: subscription.id,
            clientSecret,
        }),
        { headers: { "Content-Type": "application/json" } }
    );
}
