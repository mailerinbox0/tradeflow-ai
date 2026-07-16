# TradeFlow AI — Firebase Hosting (static frontend)

Firebase project: **inboxmailer-b9020**  
Site: **tradeflow-ai-b9020** → https://tradeflow-ai-b9020.web.app  

API / SSR stays on Fly: https://tradeflow-ai.fly.dev  

## Deploy

```powershell
cd c:\Users\HomePC\Cliq-WorkSpace\tradeflow-ai\web
npm run build:firebase
cd ..
firebase deploy --only hosting --project inboxmailer-b9020
```

The static build points `NEXT_PUBLIC_API_URL` at Fly. Fly must allow CORS from the Firebase origin (handled in `web/src/middleware.ts`).
