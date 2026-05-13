# Project Handoff

## What We Built

Home Budget is a private household budgeting and money planning web app intended to run on a home VM.

Implemented so far:

- Next.js app router project with TypeScript.
- Google sign-in via NextAuth.
- Prisma/PostgreSQL data model for users, households, financial accounts, transactions, budget categories, monthly budgets, goals, burst spending items, and wealth plans.
- Plaid Link flow for connecting accounts.
- Plaid transaction sync endpoint using Transactions Sync.
- Core app screens:
  - Landing/sign-in page
  - Dashboard
  - Transactions review/categorization
  - Budget categories
  - Goals
  - Burst spending and long-term planning
- Basic README and `.env.example` for local and VM setup.

## Key Files

- `README.md` - setup, OAuth, Plaid, and deployment notes.
- `.env.example` - required environment variables.
- `prisma/schema.prisma` - database schema and domain model.
- `lib/auth.ts` - NextAuth Google configuration.
- `lib/household.ts` - authenticated household bootstrap and starter data.
- `lib/plaid.ts` - Plaid client configuration.
- `lib/money.ts` - formatting and wealth projection helpers.
- `app/api/plaid/*/route.ts` - Plaid Link token, token exchange, and transaction sync endpoints.
- `app/actions/budget-actions.ts` - server actions for categories, goals, burst items, wealth plans, and transaction updates.
- `app/dashboard/page.tsx` - monthly overview.
- `app/transactions/page.tsx` - transaction categorization and burst flagging.
- `app/budgets/page.tsx` - category management.
- `app/goals/page.tsx` - savings goal tracking.
- `app/planning/page.tsx` - burst spending and wealth scenario planning.
- `components/plaid-connect.tsx` - Plaid Link browser component.

## Known Issues / Gaps

- No real `.env` is committed. Google OAuth, Plaid credentials, `NEXTAUTH_SECRET`, and `DATABASE_URL` must be configured locally or on the VM.
- No Prisma migration files exist yet. Run `npx prisma migrate dev` after setting `DATABASE_URL`.
- Plaid sync currently requires an authenticated web session. A VM cron job needs either a dedicated server-side job path or a protected internal sync command.
- Household sharing/invite flow is not implemented yet. The first signed-in user auto-creates a household.
- Transactions can be categorized and marked as burst spending, but there is no rule engine for automatic categorization.
- Budgeting is category-level only; monthly budget editing is not fully built out.
- No CSV import/export yet.
- No tests yet.
- `npm install` reported 5 audit findings: 2 low and 3 moderate. `npm audit fix --force` was not run because it may introduce breaking changes.

## Next Steps

1. Create `.env` from `.env.example` and configure Postgres, Google OAuth, NextAuth, and Plaid sandbox credentials.
2. Run `npx prisma migrate dev` to create the first migration and local database tables.
3. Add a proper household invite/allowlist flow for both spouses.
4. Extract Plaid sync logic into a reusable service and add a cron-safe import job for the home VM.
5. Add transaction categorization rules based on merchant/name patterns.
6. Build monthly budget editing and variance reporting.
7. Add seed data and focused tests for auth bootstrap, wealth projections, and transaction sync behavior.
8. Review dependency audit findings and update safely.
