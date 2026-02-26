export async function findOrCreateCustomer(uid, email, secret) {
    // search by metadata
    const searchRes = await fetch(
        `https://api.stripe.com/v1/customers/search?query=${encodeURIComponent(
            `metadata['firebase_uid']:'${uid}'`
        )}`,
        {
            headers: { Authorization: `Bearer ${secret}` },
        }
    );

    const search = await searchRes.json();

    if (search.data && search.data.length > 0) {
        return search.data[0].id;
    }

    // create
    const form = new URLSearchParams();
    form.set("email", email);
    form.set("metadata[firebase_uid]", uid);

    const createRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
    });

    const customer = await createRes.json();
    return customer.id;
}

export async function attachPaymentMethod(customerId, paymentMethodId, secret) {
    // attach
    const attachRes = await fetch(
        `https://api.stripe.com/v1/payment_methods/${paymentMethodId}/attach`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ customer: customerId }).toString(),
        }
    );

    // set default
    await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            "invoice_settings[default_payment_method]": paymentMethodId,
        }).toString(),
    });
}

export async function createSubscription(
    customerId,
    priceId,
    uid,
    secret
) {
    const form = new URLSearchParams();
    form.set("customer", customerId);
    form.set("items[0][price]", priceId);
    form.set("metadata[firebase_uid]", uid);

    const res = await fetch("https://api.stripe.com/v1/subscriptions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
    });

    const sub = await res.json();
    return sub.id;
}
