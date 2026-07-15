# TradeFlow AI — deployment notes

## Architecture

- **Product app:** `web/` (Next.js UI + API routes) — self-contained
- **Database:** Supabase Postgres (`supabase/migrations/`)
- **Runtime persistence:** `app_runtime_state` JSON snapshot (bridges demo-store until full table wiring)
- **Legacy:** `frontend/` + `backend/` not required for production

## Git (local)

```powershell
cd c:\Users\HomePC\Cliq-WorkSpace\tradeflow-ai
git add -A
git commit -m "Deploy prep: Fly Dockerfile, Supabase persist bridge"
# Add remote when ready:
# git remote add origin https://github.com/<you>/tradeflow-ai.git
# git push -u origin master
```

## Supabase

1. Login (one-time):

```powershell
npx supabase login
```

2. Create project + link + push migrations:

```powershell
cd c:\Users\HomePC\Cliq-WorkSpace\tradeflow-ai
npx supabase projects create tradeflow-ai --org-id <ORG_ID> --db-password <STRONG_PASSWORD> --region us-east-1
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

Or paste `001_init.sql` + `002_app_runtime_state.sql` into the SQL editor.

3. Copy the **Session pooler** Postgres URI into Fly as `DATABASE_URL` (see below).

> **Note:** Fly persistence uses direct Postgres (`DATABASE_URL`) for the `app_runtime_state` snapshot table. Legacy JWT Supabase API keys (`anon` / `service_role`) are optional for future browser auth. New `sb_publishable_*` / `sb_secret_*` keys do not work with `@supabase/supabase-js` REST yet.

## Fly.io

```powershell
cd c:\Users\HomePC\Cliq-WorkSpace\tradeflow-ai\web
fly apps create tradeflow-ai
fly secrets set NEXT_PUBLIC_APP_URL=https://tradeflow-ai.fly.dev DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
fly deploy
```

## No local Docker database

This project never used a local Docker Postgres. Schema lives only in `supabase/migrations/` — apply directly to hosted Supabase (nothing to migrate from Docker).
