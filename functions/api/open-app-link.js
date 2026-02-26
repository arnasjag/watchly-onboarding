export async function onRequestGet(context) {
    const { APPFLYER_ONELINK_BASE_URL, HANDOFF_KV } = context.env;
    const urlReq = new URL(context.request.url);
    const paymentIntent = urlReq.searchParams.get("payment_intent");

    if (!APPFLYER_ONELINK_BASE_URL) {
        return Response.json({ error: "Missing APPFLYER_ONELINK_BASE_URL" }, { status: 500 });
    }
    if (!paymentIntent) {
        return Response.json({ error: "Missing paymentIntent" }, { status: 400 });
    }

    const TEN_MINUTES = 60 * 10;
    const ONE_WEEK = 60 * 60 * 24 * 7;
    const token = crypto.randomUUID();

    await HANDOFF_KV.put(`handoff:${token}`, JSON.stringify({ paymentIntent }), { expirationTtl: ONE_WEEK });

    const oneLink = new URL(APPFLYER_ONELINK_BASE_URL);
    oneLink.searchParams.set("deep_link_value", "premium");
    oneLink.searchParams.set("deep_link_sub1", token);

    // legacy
    oneLink.searchParams.set("af_sub1", token);
    oneLink.searchParams.set("af_dp", "premium");

    return Response.redirect(oneLink.toString(), 302);
}
