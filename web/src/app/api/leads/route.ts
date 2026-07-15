import { error, json } from "@/lib/api";
import { getStore, sendLeadCampaignEmail, uid } from "@/lib/demo-store";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(res: Response) {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = String(searchParams.get("email") || "")
    .trim()
    .toLowerCase();
  const store = getStore();

  if (!email) {
    return withCors(json({ leads: store.leads, leadCampaign: store.leadCampaign }));
  }

  const lead = store.leads.find((l) => l.email === email);
  const userExists = store.users.some((u) => u.email === email);
  if (lead || userExists) {
    return withCors(
      json({
        exists: true,
        message: "Email already exists",
        lead: lead || null,
        userExists,
      }),
    );
  }
  return withCors(json({ exists: false, message: "New email" }));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "create").trim();
  const store = getStore();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();

  if (action === "lookup" || action === "search") {
    if (!email || !email.includes("@")) return withCors(error("Valid email required"));
    const lead = store.leads.find((l) => l.email === email);
    const userExists = store.users.some((u) => u.email === email);
    if (lead || userExists) {
      return withCors(
        json({
          exists: true,
          message: "Exists",
          lead: lead || null,
          userExists,
        }),
      );
    }
    return withCors(json({ exists: false, message: "New" }));
  }

  if (action === "create") {
    if (!email || !email.includes("@")) return withCors(error("Valid email required"));
    const exists =
      store.leads.some((l) => l.email === email) || store.users.some((u) => u.email === email);
    if (exists) {
      return withCors(json({ ok: false, exists: true, code: "EXISTS", message: "Exists" }, 409));
    }
    const lead = {
      id: uid("lead"),
      email,
      source: String(body.source || "mailing-extension"),
      campaignStatus: "new",
      createdAt: new Date().toISOString(),
    };
    store.leads.unshift(lead);
    return withCors(
      json({
        ok: true,
        exists: false,
        code: "CREATED",
        message: "Lead saved — enter name and send",
        lead,
      }),
    );
  }

  if (action === "send") {
    if (!email || !email.includes("@")) return withCors(error("Valid email required"));
    const name = String(body.name || "").trim();
    if (!name) return withCors(error("Lead name required"));

    let lead = store.leads.find((l) => l.email === email);
    if (!lead) {
      // Allow send after create race: create then send
      if (store.users.some((u) => u.email === email)) {
        return withCors(json({ ok: false, exists: true, code: "EXISTS", message: "Exists" }, 409));
      }
      lead = {
        id: uid("lead"),
        email,
        name,
        source: String(body.source || "mailing-extension"),
        campaignStatus: "new",
        createdAt: new Date().toISOString(),
      };
      store.leads.unshift(lead);
    } else {
      lead.name = name;
    }

    const result = sendLeadCampaignEmail(lead);
    if (!result.ok) {
      return withCors(
        json({
          ok: false,
          code: "FAILED",
          message: result.error || "Failed",
          lead,
        }),
      );
    }
    return withCors(
      json({
        ok: true,
        code: "SENT",
        message: "Campaign message sent",
        lead,
        mail: result.mail,
      }),
    );
  }

  // Legacy: POST email only → create like before
  if (!email || !email.includes("@")) return withCors(error("Valid email required"));
  const exists =
    store.leads.some((l) => l.email === email) || store.users.some((u) => u.email === email);
  if (exists) {
    return withCors(json({ ok: false, code: "EXISTS", message: "Email already exists" }, 409));
  }
  const lead = {
    id: uid("lead"),
    email,
    source: String(body.source || "extension"),
    campaignStatus: "new",
    createdAt: new Date().toISOString(),
  };
  store.leads.unshift(lead);
  return withCors(
    json({
      ok: true,
      code: "CREATED",
      message: "Lead saved",
      lead,
    }),
  );
}
