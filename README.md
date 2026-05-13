# Home Budget

A private web-based budgeting and household money planning tool for two people. It supports Google sign-in, Plaid transaction imports, budget categories, goals, burst spending, and multi-year wealth scenarios.

## Stack

- Next.js app router
- NextAuth with Google OAuth
- Prisma with PostgreSQL
- Plaid Link and Transactions Sync

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create an environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill in:

   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `PLAID_CLIENT_ID`
   - `PLAID_SECRET`

4. Create and migrate the database:

   ```bash
   npx prisma migrate dev
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

## Google OAuth

Create an OAuth client in Google Cloud Console and add these redirect URLs:

- Local: `http://localhost:3000/api/auth/callback/google`
- VM: `https://your-budget-domain.example/api/auth/callback/google`

For home server use, put the app behind HTTPS with a reverse proxy such as Caddy, Traefik, or Nginx.

## Plaid

Start with `PLAID_ENV=sandbox`. The UI loads Plaid Link from Plaid's CDN, exchanges the public token server-side, stores the item access token, and uses `/api/plaid/sync` to import transactions.

For automatic imports on the VM, schedule an authenticated POST to the sync endpoint or add a small job runner that calls the same Plaid sync service. A good cadence is every 6 to 12 hours.

## Deployment sketch

On the VM:

```bash
npm ci
npx prisma migrate deploy
npm run build
npm run start
```

Run PostgreSQL locally on the VM or point `DATABASE_URL` at another private database. Keep `.env` out of git.

## First product slice

- Sign in with Google
- Auto-create a household and starter categories
- Connect bank accounts with Plaid
- Sync imported transactions
- Categorize transactions and flag burst spending
- Track savings goals
- Compare multi-year wealth-building scenarios
