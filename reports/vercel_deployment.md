# Vercel Deployment Instructions

Deployment guide for the EV Charging Estimator on Vercel.

---

## Prerequisites

1. **Vercel account** with team/organization access
2. **GitHub repository** containing the Next.js project
3. **Environment variables** configured (see below)
4. **Node.js 18+** (Vercel default runtime)

---

## Project Structure (Expected)

```
ev-charging-estimator/
  src/
    app/              # Next.js App Router pages
    components/       # React components
    lib/              # Business logic, utilities
    styles/           # CSS / design tokens
  public/             # Static assets
  reports/            # Analysis reports (this directory -- not deployed)
  next.config.ts      # Next.js configuration
  package.json
  tsconfig.json
  .env.local          # Local environment variables (git-ignored)
  .env.example        # Template for required env vars
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `MONDAY_API_TOKEN` | Monday.com API token (for live mode) | `eyJhbGciOi...` |
| `MONDAY_BOARD_ID` | Monday.com SOW board ID | `8940346166` |
| `DATABASE_URL` | Database connection string (if using persistent storage) | `postgresql://...` |
| `NEXTAUTH_SECRET` | NextAuth.js session secret | Random 32+ char string |
| `NEXTAUTH_URL` | Canonical URL of the app | `https://estimator.bulletenergy.com` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `MONDAY_WORKSPACE_ID` | Monday.com workspace ID | `7395896` |
| `DEFAULT_MARKUP_PERCENT` | Default estimate markup | `20` |
| `DEFAULT_CONTINGENCY_PERCENT` | Default contingency | `10` |
| `DEFAULT_TAX_RATE` | Default tax rate | `0` |
| `ESTIMATE_VALIDITY_DAYS` | Days an estimate is valid | `30` |
| `ENABLE_LIVE_MODE` | Enable Monday.com integration | `false` |

### Setting environment variables in Vercel

1. Go to Vercel Dashboard > Project > Settings > Environment Variables
2. Add each variable for the appropriate environments (Production, Preview, Development)
3. Sensitive values (API tokens, secrets) should be marked as "Sensitive"
4. After adding/changing variables, redeploy for changes to take effect

---

## Initial Deployment

### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to project root
cd ev-charging-estimator

# Login to Vercel
vercel login

# Deploy (first time -- will prompt for project setup)
vercel

# Deploy to production
vercel --prod
```

### Option B: Deploy via GitHub Integration (Recommended)

1. Push code to GitHub repository
2. Go to https://vercel.com/new
3. Import the GitHub repository
4. Configure:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `.` (or subdirectory if monorepo)
   - **Build Command:** `next build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (or `pnpm install`)
5. Add environment variables
6. Click "Deploy"

### Post-deployment verification

1. Verify the deployment URL loads correctly
2. Test the estimate form with sample data
3. Test PDF generation
4. If live mode enabled, test Monday.com API connection
5. Verify authentication/login flow (if applicable)

---

## Continuous Deployment

With GitHub integration, Vercel auto-deploys:

| Trigger | Environment | URL |
|---------|-------------|-----|
| Push to `main` | Production | `estimator.bulletenergy.com` |
| Push to any other branch | Preview | `ev-charging-estimator-<branch>-<hash>.vercel.app` |
| Pull request | Preview | Linked in PR comments |

---

## Custom Domain Setup

1. Go to Vercel Dashboard > Project > Settings > Domains
2. Add domain: `estimator.bulletenergy.com` (or preferred subdomain)
3. Configure DNS:
   - **Option A (recommended):** CNAME record pointing to `cname.vercel-dns.com`
   - **Option B:** A record pointing to `76.76.21.21`
4. Vercel auto-provisions SSL certificate
5. Redirect `www` subdomain if desired

---

## Build Configuration

### `next.config.ts` recommendations

```typescript
const nextConfig = {
  // Trailing slashes (match company convention)
  trailingSlash: true,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Build output expectations

- **Build time:** < 2 minutes (typical for form-based app)
- **Bundle size:** Monitor via Vercel Analytics
- **Functions:** API routes deploy as serverless functions (default 10s timeout, increase to 30s for Monday.com API calls)

---

## Serverless Function Configuration

For API routes that call Monday.com or generate PDFs, increase timeout:

```typescript
// src/app/api/monday/items/route.ts
export const maxDuration = 30; // 30 seconds (Vercel Pro plan)
```

**Vercel plan considerations:**
- **Hobby:** 10s function timeout, 100GB bandwidth
- **Pro:** 60s function timeout, 1TB bandwidth, password protection for previews
- **Enterprise:** 900s function timeout, custom SLAs

For Monday.com API integration and PDF generation, **Pro plan is recommended**.

---

## Monitoring and Observability

### Vercel Analytics (built-in)

- Enable in Project Settings > Analytics
- Tracks Web Vitals (LCP, FID, CLS)
- Real user monitoring

### Vercel Logs

- View function logs in Vercel Dashboard > Deployments > Functions
- Filter by function name, status code, duration
- Set up log drain for persistent storage (Datadog, Axiom, etc.)

### Error Tracking (recommended)

- Integrate Sentry for error tracking:
  ```bash
  npm install @sentry/nextjs
  npx @sentry/wizard@latest -i nextjs
  ```
- Add `SENTRY_DSN` environment variable
- Captures both client-side and server-side errors

### Uptime Monitoring

- Use Vercel's built-in monitoring or external service (UptimeRobot, Pingdom)
- Monitor: main page load, API health endpoint, Monday.com connection

---

## Database Options

The estimator needs persistent storage for: estimates, rate tables, charger catalog, user settings.

| Option | Pros | Cons | Recommended For |
|--------|------|------|----------------|
| **Vercel Postgres** | Zero config, Vercel-native | Limited free tier | MVP / small scale |
| **Supabase** | Rich features, generous free tier, already in team's stack | External service | If team already uses Supabase |
| **PlanetScale** | MySQL-compatible, branching | Deprecating free tier | Not recommended |
| **Neon** | Serverless Postgres, branching | Newer service | Good alternative to Vercel Postgres |
| **Vercel KV / Blob** | Simple key-value, file storage | Not relational | Rate tables, PDF storage |

**Recommendation:** Use Vercel Postgres or Supabase (team already has Supabase experience).

---

## Deployment Checklist

### Pre-deployment

- [ ] All environment variables configured in Vercel
- [ ] `.env.example` is up to date in repository
- [ ] `.env.local` is in `.gitignore`
- [ ] No hardcoded secrets in source code
- [ ] Build succeeds locally (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Monday.com API token has correct permissions

### Post-deployment

- [ ] Production URL loads correctly
- [ ] Estimate form renders and submits
- [ ] PDF generation works
- [ ] Monday.com integration works (if enabled)
- [ ] Authentication flow works (if implemented)
- [ ] Custom domain resolves with SSL
- [ ] Analytics/monitoring enabled
- [ ] Error tracking configured

### Rollback procedure

1. Go to Vercel Dashboard > Deployments
2. Find the last known good deployment
3. Click "..." > "Promote to Production"
4. Previous deployment is instantly promoted (zero downtime)
