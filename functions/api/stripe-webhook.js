import { sendToRevenueCat } from "../revenuecat.js";
import { getOrCreateFirebaseUser } from "../firebase-user-service.js";

export async function onRequestPost(context) {
    try {
        const { STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY } = context.env;

        const signature = context.request.headers.get("stripe-signature");
        const rawBody = await context.request.text();

        const event = await verifyStripeSignature(
            rawBody,
            signature,
            STRIPE_WEBHOOK_SECRET
        );

        if (!event) {
            return new Response("Invalid signature", { status: 400 });
        }

        if (event.type === "customer.subscription.updated") {
            const subscription = event.data.object;
            const prev = event.data.previous_attributes || {};
            const subscriptionId = subscription.id;
            const customerId = subscription.customer;
            const newStatus = subscription.status;
            const oldStatus = prev.status;

            const becameActive =
                (oldStatus === "incomplete" || !oldStatus) &&
                (newStatus === "active" || newStatus === "trialing");

            if (!becameActive) {
                return new Response("not active");
            }

            const email = await getEmailFromSubscription(subscription, STRIPE_SECRET_KEY);

            if (!email) {
                return new Response("No email", { status: 500 });
            }

            const uid = await getOrCreateFirebaseUser(email, context.env);

            if (!uid) {
                return new Response("No uid", { status: 500 });
            }

            await updateStripeCustomer(customerId, email, STRIPE_SECRET_KEY);

            await updateStripeSubscriptionMetadata(
                subscriptionId,
                uid,
                email,
                STRIPE_SECRET_KEY
            );

            const userIp =
                context.request.headers.get("CF-Connecting-IP") ||
                context.request.headers.get("x-forwarded-for") ||
                null;
            const userdata = {
                uid,
                email,
                userIp
            };

            try {
                await sendToRevenueCat(subscriptionId, userdata, context.env);
            } catch (e) {
                console.error("RevenueCat sync failed:", e);
                return new Response(
                    e instanceof Error ? e.message : "RC sync failed",
                    { status: 500 }
                );
            }

            return new Response("ok");
        }

        return new Response("ok");
    } catch (e) {
        console.error("stripe-webhook error:", e);
        return new Response(
            e instanceof Error ? e.message : "Internal Server Error",
            { status: 500 }
        );
    }
}

async function getEmailFromSubscription(subscription, stripeSecret) {
    const invoiceId = subscription.latest_invoice;

    if (!invoiceId) {
        return null;
    }

    const invoiceRes = await fetch(
        "https://api.stripe.com/v1/invoices/" + invoiceId,
        {
            headers: {
                Authorization: `Bearer ${stripeSecret}`,
            },
        }
    );

    const invoice = await invoiceRes.json();

    let email = invoice.customer_email || invoice.receipt_email || null;

    if (email) return email;

    if (!invoice.payment_intent) {
        return null;
    }

    const piRes = await fetch(
        "https://api.stripe.com/v1/payment_intents/" + invoice.payment_intent,
        {
            headers: {
                Authorization: `Bearer ${stripeSecret}`,
            },
        }
    );
    const pi = await piRes.json();

    const charge = pi.charges?.data?.[0];

    return (
        pi.receipt_email ||
        charge?.billing_details?.email ||
        charge?.receipt_email ||
        null
    );
}

async function updateStripeCustomer(customerId, email, secret) {
    const form = new URLSearchParams();
    if (email) {
        form.set("email", email);
    }

    try {
        const res = await fetch("https://api.stripe.com/v1/customers/" + customerId, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: form.toString(),
        });

        await res.text();
    } catch (e) {
    }
}

async function updateStripeSubscriptionMetadata(
    subscriptionId,
    appUserId,
    email,
    secret
) {
    const form = new URLSearchParams();

    if (appUserId) {
        form.set("metadata[app_user_id]", appUserId);
    }
    if (email) {
        form.set("metadata[email]", email);
    }

    try {
        const res = await fetch(
            "https://api.stripe.com/v1/subscriptions/" + subscriptionId,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${secret}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: form.toString(),
            }
        );

        const text = await res.text();
    } catch (e) {}
}


/* ------------------ VERIFY SIGNATURE ------------------- */
async function verifyStripeSignature(payload, signature, secret) {
    try {
        const sigParts = signature.split(",");
        const timestamp = sigParts
            .find((x) => x.startsWith("t="))
            .replace("t=", "");
        const signatureHash = sigParts
            .find((x) => x.startsWith("v1="))
            .replace("v1=", "");

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        );

        const signedPayload = `${timestamp}.${payload}`;
        const ok = await crypto.subtle.verify(
            "HMAC",
            key,
            hexToBytes(signatureHash),
            encoder.encode(signedPayload)
        );

        if (!ok) return null;
        return JSON.parse(payload);
    } catch (e) {
        return null;
    }
}

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}
