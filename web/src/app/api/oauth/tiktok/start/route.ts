import { error, json } from "@/lib/api";
import { getStore, uid } from "@/lib/demo-store";

/** Builds TikTok OAuth URL from admin-configured app settings */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const app = getStore().socialConfig.tiktokApp;
  if (!app.clientKey) {
    return error("Set TikTok Client Key in Admin → Configuration → TikTok first");
  }
  const redirectUri = app.redirectUri || `${new URL(req.url).origin}/api/oauth/tiktok/callback`;
  const state = uid("ttstate");
  const g = globalThis as unknown as { __tfTikTokOAuthState?: string };
  g.__tfTikTokOAuthState = state;

  const url = new URL(app.authUrl || "https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", app.clientKey);
  url.searchParams.set("scope", app.scopes || "user.info.basic");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  if (searchParams.get("redirect") === "1") {
    return Response.redirect(url.toString(), 302);
  }
  return json({
    authUrl: url.toString(),
    redirectUri,
    clientKeySet: Boolean(app.clientKey),
    clientSecretSet: Boolean(app.clientSecret),
  });
}
