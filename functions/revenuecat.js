export async function sendToRevenueCat(subscriptionId, userdata, env) {
    const { REVENUECAT_API_KEY } = env;

    const payload = {
        app_user_id: userdata.uid,
        fetch_token: subscriptionId
    };

    const receipts = await fetch("https://api.revenuecat.com/v1/receipts", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'X-Platform': 'stripe',
            'Authorization': 'Bearer ' + REVENUECAT_API_KEY,
        },
        body: JSON.stringify(payload),
    });

    if (!receipts.ok) {
        const body = await receipts.text();
        throw new Error(`RevenueCat /receipts failed: ${receipts.status} ${body}`);
    }

    const attrs = {
        $email: {
            value: userdata.email,
            updated_at_ms: Date.now(),
        },
    };

    if (userdata.userIp) {
        attrs.$ip = {
            value: userdata.userIp,
            updated_at_ms: Date.now(),
        };
    }

    const body = {
        attributes: attrs,
    };

    const attributes = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userdata.uid)}/attributes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + REVENUECAT_API_KEY,
        },
        body: JSON.stringify(body),
    });

    if (!attributes.ok) {
        const body = await attributes.text();
        throw new Error(`RevenueCat /attributes failed: ${attributes.status} ${body}`);
    }
}
