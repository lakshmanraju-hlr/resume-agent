# Hemanth's Job Application Agent

AI-powered resume tailoring + autofill bookmarklet. Built with Next.js, deployed on Vercel.

## Features

- **Resume Tailor** — paste a job URL or JD, Claude rewrites your resume to maximize ATS keyword match, shows before/after score
- **Autofill Bookmarklet** — one-click autofill for Workday, Greenhouse, Lever, LinkedIn, iCIMS, and more
- **Your Profile** — all your details in one place

---

## Deploy in 5 minutes

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create resume-agent --public --push
# or manually create repo on github.com and push
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `resume-agent` GitHub repo
3. Vercel auto-detects Next.js — click **Deploy**

### 3. Add your Anthropic API key

1. In Vercel dashboard → your project → **Settings → Environment Variables**
2. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-...` (your key from console.anthropic.com)
3. Click **Save** → go to **Deployments** → **Redeploy**

Your app is live at `https://resume-agent-xxx.vercel.app` 🎉

---

## Run locally

```bash
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local

npm install
npm run dev
# Open http://localhost:3000
```

---

## Updating your profile or resume

Edit `src/data.ts` — the `PROFILE` object and `BASE_RESUME` string.
Push to GitHub → Vercel auto-redeploys.

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Anthropic SDK (server-side, API key never exposed)
- Tailwind CSS
- Google Fonts (DM Sans, DM Mono, DM Serif Display)
