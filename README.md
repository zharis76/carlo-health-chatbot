# Carlo Health Chatbot

AI health chatbot with Carlo Ethics.ai compliance layer. Built with Next.js, deployable to Vercel in one click.

---

## Architecture

```
User message
  → Carlo compliance check (input)         ← /api/compliance
  → If blocked: show error, stop
  → Anthropic AI generates response         ← /api/chat
  → Carlo compliance check (output)        ← /api/compliance
  → If blocked: show safe fallback
  → Display to user with compliance badge
```

---

## Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.local.example .env.local
```

Then fill in `.env.local`:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key

# Get these from carlo.algorethics.ai after creating your Health project:
CARLO_API_KEY=your_carlo_api_key
CARLO_PROJECT_ID=your_carlo_project_id
CARLO_ENDPOINT=https://carlo.algorethics.ai/api/dashboard/analyze
```

> **Note:** If CARLO_API_KEY and CARLO_PROJECT_ID are left empty, the app runs in bypass mode — the chatbot works normally, Carlo checks are skipped, and a "Not configured" label shows in the sidebar. No errors.

### 3. Run locally
```bash
npm run dev
```

Visit `http://localhost:3000`

---

## Deploy to Vercel

### Option A — GitHub (recommended)
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Add environment variables in Vercel dashboard (Settings → Environment Variables):
   - `ANTHROPIC_API_KEY`
   - `CARLO_API_KEY`
   - `CARLO_PROJECT_ID`
   - `CARLO_ENDPOINT`
4. Click Deploy

### Option B — Vercel CLI
```bash
npm install -g vercel
vercel
# Follow prompts, then add env vars in Vercel dashboard
```

---

## Adding Carlo Keys (after creating health project on Carlo dashboard)

1. Go to `carlo.algorethics.ai` → Projects → Create New Project (Health)
2. Copy the API Key and Project ID from Code Setup tab
3. Add to Vercel environment variables (or `.env.local` for local dev)
4. Redeploy — Carlo compliance layer activates automatically, no code changes needed

---

## Adding the Carlo Seal (later)

In `components/HealthChatbot.tsx`, find the TODO comment in `CompliancePanel`:
```tsx
{/* TODO: Replace with actual Carlo seal URL once health project is live
<a href="https://carlo.algorethics.ai/seal/YOUR_PROJECT_ID" ...>
```
Replace `YOUR_PROJECT_ID` with your actual Carlo project ID and uncomment.

---

## Project Structure

```
carlo-health-chatbot/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page
│   ├── globals.css         # Global styles (soft medical theme)
│   └── api/
│       ├── chat/
│       │   └── route.ts    # Anthropic API (server-side, key protected)
│       └── compliance/
│           └── route.ts    # Carlo compliance middleware (server-side)
├── components/
│   └── HealthChatbot.tsx   # Full chatbot UI component
├── lib/
│   ├── types.ts            # TypeScript types
│   └── storage.ts          # localStorage session management
├── .env.local.example      # Env template — copy to .env.local
├── .gitignore              # Keeps secrets out of git
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## Notes for Vishal

- All API keys live server-side in `/app/api/` routes — never exposed to the browser
- Carlo compliance runs twice per message: once on input, once on output
- If Carlo is unavailable, the app fails open (lets the message through) — adjust in `/app/api/compliance/route.ts` if you want fail-closed behaviour
- Chat history is localStorage only for now — swap `lib/storage.ts` for a DB when ready
- The Anthropic model is set to `claude-opus-4-5` in `/app/api/chat/route.ts` — change as needed
