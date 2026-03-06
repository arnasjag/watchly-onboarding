// /functions/api/firebase-user.ts

interface Env {
    FIREBASE_PROJECT_ID: string;
    FIREBASE_CLIENT_EMAIL: string;
    FIREBASE_PRIVATE_KEY: string;
}

const allowedOrigins = [
    "https://watchly-onboarding.pages.dev",
    "http://localhost:5173",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
    if (origin && allowedOrigins.includes(origin)) {
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Content-Type": "application/json; charset=utf-8",
        };
    }

    return {
        "Content-Type": "application/json; charset=utf-8",
    };
}

function json(data: unknown, status = 200, origin: string | null = null): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: getCorsHeaders(origin),
    });
}

function base64UrlEncode(input: ArrayBuffer | string): string {
    const bytes =
        typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);

    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
    const cleanPem = privateKeyPem
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\n/g, "");

    const binaryDer = Uint8Array.from(atob(cleanPem), (c) => c.charCodeAt(0));

    return crypto.subtle.importKey(
        "pkcs8",
        binaryDer.buffer,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        false,
        ["sign"]
    );
}

async function createAccessToken(env: Env): Promise<string> {
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
    const cryptoKey = await importPrivateKey(privateKey);

    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        new TextEncoder().encode(unsignedJwt)
    );

    const signedJwt = `${unsignedJwt}.${base64UrlEncode(signature)}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: signedJwt,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get access token: ${errorText}`);
    }

    const data = (await response.json()) as { access_token: string };

    return data.access_token;
}

async function lookupUserByEmail(
    env: Env,
    accessToken: string,
    email: string
): Promise<string | null> {
    const response = await fetch(
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

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lookup failed: ${errorText}`);
    }

    const data = (await response.json()) as {
        users?: Array<{ localId: string }>;
    };

    return data.users?.[0]?.localId ?? null;
}

async function createUser(
    env: Env,
    accessToken: string,
    email: string
): Promise<string> {
    const response = await fetch(
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

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Create user failed: ${errorText}`);
    }

    const data = (await response.json()) as { localId: string };

    return data.localId;
}

function isOriginAllowed(origin: string | null): boolean {
    return !!origin && allowedOrigins.includes(origin);
}

export async function onRequestOptions(context: { request: Request }) {
    const origin = context.request.headers.get("Origin");

    if (!isOriginAllowed(origin)) {
        return new Response(null, { status: 403 });
    }

    return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
    });
}

export async function onRequestPost(context: { request: Request; env: Env }) {
    const { request, env } = context;
    const origin = request.headers.get("Origin");

    if (!isOriginAllowed(origin)) {
        return json({ error: "Forbidden" }, 403, origin);
    }

    try {
        const body = (await request.json()) as { customerEmail?: string };
        const customerEmail = body.customerEmail?.trim().toLowerCase();

        if (!customerEmail) {
            return json({ error: "customerEmail is required" }, 400, origin);
        }

        const accessToken = await createAccessToken(env);

        let uid = await lookupUserByEmail(env, accessToken, customerEmail);

        if (!uid) {
            uid = await createUser(env, accessToken, customerEmail);
        }

        return json({ uid }, 200, origin);
    } catch (error) {
        return json(
            {
                error: error instanceof Error ? error.message : "Unknown error",
            },
            500,
            origin
        );
    }
}