import { error, json } from "@/lib/api";
import { getStore, uid } from "@/lib/demo-store";

/**
 * TikTok OAuth callback — exchanges code for tokens using admin-configured app settings.
 * In demo/admin flow, tokens are stored on a new/updated TikTok account row.
 */
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");
  const errDesc = searchParams.get("error_description");

  if (err) {
    return error(`TikTok OAuth error: ${errDesc || err}`, 400);
  }
  if (!code) return error("Missing OAuth code", 400);

  const g = globalThis as unknown as { __tfTikTokOAuthState?: string };
  if (g.__tfTikTokOAuthState && state && state !== g.__tfTikTokOAuthState) {
    return error("Invalid OAuth state", 400);
  }

  const app = getStore().socialConfig.tiktokApp;
  if (!app.clientKey || !app.clientSecret) {
    return error("TikTok Client Key / Secret missing in Admin Configuration", 400);
  }

  const redirectUri = app.redirectUri || `${origin}/api/oauth/tiktok/callback`;
  const tokenUrl = app.tokenUrl || "https://open.tiktokapis.com/v2/oauth/token/";

  try {
    const body = new URLSearchParams({
      client_key: app.clientKey,
      client_secret: app.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      open_id?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
      data?: {
        access_token?: string;
        refresh_token?: string;
        open_id?: string;
        expires_in?: number;
      };
    };

    const accessToken = data.access_token || data.data?.access_token;
    const refreshToken = data.refresh_token || data.data?.refresh_token || "";
    const openId = data.open_id || data.data?.open_id || "";
    const expiresIn = data.expires_in || data.data?.expires_in;

    if (!accessToken) {
      return error(
        data.error_description || data.error || "TikTok did not return an access token",
        400,
      );
    }

    const accounts = getStore().socialConfig.tiktokAccounts;
    const existing = openId ? accounts.find((a) => a.openId === openId) : undefined;
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : undefined;

    if (existing) {
      existing.accessToken = accessToken;
      existing.refreshToken = refreshToken || existing.refreshToken;
      existing.openId = openId || existing.openId;
      existing.tokenExpiresAt = expiresAt;
      existing.linked = true;
      existing.linkedAt = new Date().toISOString();
    } else {
      accounts.unshift({
        id: uid("tt"),
        label: openId ? `TikTok ${openId.slice(0, 8)}` : "TikTok OAuth account",
        username: openId ? openId.slice(0, 12) : "oauth-user",
        accessToken,
        refreshToken,
        openId,
        tokenExpiresAt: expiresAt,
        linked: true,
        linkedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    return Response.redirect(`${origin}/admin?tiktok=connected`, 302);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Token exchange failed", 500);
  }
}
