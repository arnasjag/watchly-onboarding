export async function getOrCreateFirebaseUser(email, env) {
    const accessToken = await createAccessToken(env);

    let uid = await lookupUserByEmail(env, accessToken, email);

    if (!uid) {
        uid = await createUser(env, accessToken, email);
    }

    return uid;
}

/* ---------------- ACCESS TOKEN ---------------- */

async function createAccessToken(env) {
    const now = Math.floor(Date.now() / 1000);

    const header = {
        alg: "RS256",
        typ: "JWT",
    };

    const payload = {
        iss: env.FIREBASE_CLIENT_EMAIL,
        scope: "https://www.googleapis.com/auth/identitytoolkit",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const unsignedJwt = `${encodedHeader}.${encodedPayload}`;

    const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

    const key = await importPrivateKey(privateKey);

    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        key,
        new TextEncoder().encode(unsignedJwt)
    );

    const jwt = `${unsignedJwt}.${base64UrlEncode(signature)}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    });

    if (!tokenRes.ok) {
        const text = await tokenRes.text();
        throw new Error("OAuth error: " + text);
    }

    const tokenData = await tokenRes.json();

    return tokenData.access_token;
}

/* ---------------- LOOKUP USER ---------------- */

async function lookupUserByEmail(env, accessToken, email) {
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:lookup`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                email: [email],
            }),
        }
    );

    if (!res.ok) {
        const text = await res.text();
        throw new Error("Lookup failed: " + text);
    }

    const data = await res.json();

    return data.users?.[0]?.localId || null;
}

/* ---------------- CREATE USER ---------------- */

async function createUser(env, accessToken, email) {
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                email,
            }),
        }
    );

    if (!res.ok) {
        const text = await res.text();
        throw new Error("Create user failed: " + text);
    }

    const data = await res.json();

    return data.localId;
}

/* ---------------- CRYPTO HELPERS ---------------- */

async function importPrivateKey(pem) {
    const clean = pem
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\n/g, "");

    const binary = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));

    return crypto.subtle.importKey(
        "pkcs8",
        binary.buffer,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        false,
        ["sign"]
    );
}

function base64UrlEncode(input) {
    const bytes =
        typeof input === "string"
            ? new TextEncoder().encode(input)
            : new Uint8Array(input);

    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}