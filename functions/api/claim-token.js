export async function onRequestPost(context) {
    try {
        const { HANDOFF_KV } = context.env;

        if (!HANDOFF_KV) {
            return Response.json({ error: "Missing HANDOFF_KV binding" }, { status: 500 });
        }

        const body = await context.request.json().catch(() => ({}));
        const token = body?.token;

        if (!token) {
            return Response.json({ error: "Missing token" }, { status: 400 });
        }

        const key = `handoff:${token}`;

        const raw = await HANDOFF_KV.get(key);
        if (!raw) {
            return Response.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        let paymentIntent;
        try {
            const parsed = JSON.parse(raw);
            paymentIntent = parsed?.paymentIntent;
        } catch {
            return Response.json({ error: "Invalid KV JSON" }, { status: 500 });
        }

        if (!paymentIntent) {
            return Response.json({ error: "Missing paymentIntent in KV" }, { status: 500 });
        }

        const url = "https://watchfaces.co/firebase/auth.php";

        let res;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentIntentId: paymentIntent }),
            });
        } catch (e) {
            return Response.json({ error: "Failed to reach PHP endpoint" }, { status: 502 });
        }

        if (!res.ok) {
            return Response.json({ error: "PHP claim failed", status: res.status }, { status: 502 });
        }

        let phpJson;
        try {
            phpJson = await res.json();
        } catch {
            return Response.json({ error: "PHP endpoint returned non-JSON" }, { status: 502 });
        }

        const uid = phpJson?.uid;
        const firebaseCustomToken = phpJson?.firebaseCustomToken;

        if (!uid || !firebaseCustomToken) {
            return Response.json({ error: "Invalid PHP response shape" }, { status: 502 });
        }

        await HANDOFF_KV.delete(key);

        return Response.json({ uid, firebaseCustomToken });
    } catch (e) {
        console.error("CLAIM_TOKEN_FATAL", e);
        return Response.json({ error: "Internal error" }, { status: 500 });
    }
}
