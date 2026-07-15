# TradeFlow AI – Crypto Trading Platform

Production-oriented **Next.js + Supabase** crypto trading platform (dark premium UI).

## Stack

- **Web:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion, Zustand, Zod
- **Data:** Supabase PostgreSQL schema in `supabase/migrations/` (demo API store works without Supabase for local UI)
- **Extension:** `extensions/lead-capture` Chrome MV3 popup
- **Legacy:** `frontend-vite-legacy/` and `backend/` from first scaffold (optional)

## Modules delivered (v0.1 foundation)

1. Marketing landing (Crown Capital–style → TradeFlow AI branding)
2. Signup / login with **email OTP** (all countries)
3. Dashboard + live market snapshot + activity banner
4. Deposit wizard (amount → asset/network → address/QR → pending)
5. Withdrawals
6. Trading desk (balance gate, durations, active/win/loss, **max loss 10% of stake**)
7. Admin (users, wallets, deposits/withdrawals, leads, applications)
8. Careers + AI interview chat flow (scheduled +10 min)
9. Lead capture extension → `/api/leads`
10. Social automation queue (**real activity only** — no fabricated receipts/testimonials)

## Run locally

```powershell
cd c:\Users\HomePC\Cliq-WorkSpace\tradeflow-ai\web
copy .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Trader | trader@tradeflow.ai | tradeflow123 |
| Admin | admin@tradeflow.ai | admin123456 |

OTP codes are returned in API responses as `demoCode` until an email provider (Resend/SES) is connected.

## Supabase

1. Create a Supabase project
2. Run `supabase/migrations/001_init.sql` in the SQL editor
3. Set in `web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Wire demo routes to Supabase clients next (schema is ready).

## Lead extension

Chrome → Extensions → Load unpacked → `extensions/lead-capture`  
Point API in `popup.js` at your deployed `/api/leads`.

## Important policy

Telegram/TikTok automation schedules **only verified `activity_feed` events** from the platform. Generating fake withdrawals or fabricated testimonials for social proof is **not implemented** and will not be added.

## Next implementation slices

- Supabase Auth OTP + RLS policies end-to-end
- Blockchain payment webhooks / address indexing
- OpenAI interview evaluation + admin live chat realtime
- Resend email campaigns
- Telegram Bot + approved TikTok posting
- Push notifications
- Production hardening (rate limits, audit logs)

Trading involves risk. No system can guarantee profits.
