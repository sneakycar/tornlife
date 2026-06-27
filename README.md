# TORN LIFE

Companion web application for Torn City. Interprets your gameplay into the fictional everyday life of a persistent character.

## Setup order (do these in sequence)

### 1. Git repository

```bash
cd ~/projects/TORNLIFE
git add .
git commit -m "Initial TORN LIFE MVP"
```

Create a private GitHub repo, then:

```bash
git remote add origin git@github.com:YOUR_USER/tornlife.git
git push -u origin main
```

### 2. Supabase project

Your org is at the 2-project free limit. Before proceeding:

- Pause or delete an unused project, **or** upgrade the org, **or** repurpose an existing project.

Then create and link:

```bash
supabase projects create tornlife --org-id YOUR_ORG_ID --region us-west-1
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This applies both migrations (`initial_schema` + `character_agency`).

From the Supabase dashboard → **Settings → API**, copy:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (never expose client-side)

### 3. Environment variables (local)

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Source |
|----------|--------|
| `MY_TORN_API_KEY` | [torn.com/preferences.php#tab=api](https://www.torn.com/preferences.php#tab=api) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard |
| `OPENAI_API_KEY` | OpenAI |
| `CRON_SECRET` | Any random string you generate |

Test locally:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). First visit shows the Character Assessment (not the logbook). Use **LOCK THIS LIFE** when ready.

### 4. Vercel project

1. Go to [vercel.com/new](https://vercel.com/new) → import the GitHub repo
2. Framework preset: **Next.js** (auto-detected)
3. Add all env vars from `.env.local` (same names)
4. Deploy

Do **not** add the domain yet — deploy first and confirm the `.vercel.app` URL works.

### 5. DNS / subdomain (`tornlife.makeawesome.com`)

In your DNS provider for `makeawesome.com`:

**Option A — CNAME (recommended)**

| Type | Name | Value |
|------|------|-------|
| CNAME | `tornlife` | `cname.vercel-dns.com` |

**Option B — If using Cloudflare**

- Add CNAME `tornlife` → `cname.vercel-dns.com`
- Set proxy to **DNS only** (grey cloud) initially while verifying

In Vercel → Project → **Settings → Domains**:

1. Add `tornlife.makeawesome.com`
2. Wait for DNS propagation (minutes to hours)
3. Vercel provisions SSL automatically

### 6. Verify production

1. Visit `https://tornlife.makeawesome.com`
2. Confirm assessment loads, corrections work, lock generates logbook
3. Cron sync runs every 15 min via `vercel.json` — ensure `CRON_SECRET` is set if you want the endpoint protected

### 7. Ongoing

- Push to `main` → Vercel auto-deploys
- Schema changes: `supabase migration new <name>` → `supabase db push` → redeploy

---

## Architecture

```
Frontend UI → LifeService → CharacterEngine → NarrativeEngine
                                        → SnapshotEngine
                                        → TornApiClient
                                        → Supabase
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MY_TORN_API_KEY` | Your Torn API key (server-side only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `OPENAI_API_KEY` | OpenAI API key for narrative generation |
| `OPENAI_MODEL` | Optional, defaults to `gpt-4o-mini` |
| `CRON_SECRET` | Optional bearer token for cron sync endpoint |
