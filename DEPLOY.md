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

3. Copy Project URL, anon key, and service_role key into Fly secrets.

## Fly.io

```powershell
cd c:\Users\HomePC\Cliq-WorkSpace\tradeflow-ai\web
fly apps create tradeflow-ai
fly secrets set NEXT_PUBLIC_APP_URL=https://tradeflow-ai.fly.dev NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
fly deploy
```

## No local Docker database

This project never used a local Docker Postgres. Schema lives only in `supabase/migrations/` — apply directly to hosted Supabase (nothing to migrate from Docker).
