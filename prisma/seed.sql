DO $$
DECLARE
  v_user_id text;
  v_household_id text;
  v_month timestamp := date_trunc('month', now());
BEGIN
  SELECT id INTO v_user_id
  FROM "User"
  ORDER BY "createdAt"
  LIMIT 1;

  IF v_user_id IS NULL THEN
    INSERT INTO "User" (id, email, name, "createdAt", "updatedAt")
    VALUES ('seed-user', 'demo@bfclabs.com', 'Demo User', now(), now())
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = now()
    RETURNING id INTO v_user_id;
  END IF;

  SELECT hm."householdId" INTO v_household_id
  FROM "HouseholdMember" hm
  WHERE hm."userId" = v_user_id
  ORDER BY hm."createdAt"
  LIMIT 1;

  IF v_household_id IS NULL THEN
    v_household_id := 'seed-household';

    INSERT INTO "Household" (id, name, "createdAt", "updatedAt")
    VALUES (v_household_id, 'Home', now(), now())
    ON CONFLICT (id) DO UPDATE SET "updatedAt" = now();

    INSERT INTO "HouseholdMember" (id, "householdId", "userId", role, "createdAt")
    VALUES ('seed-owner-member', v_household_id, v_user_id, 'OWNER', now())
    ON CONFLICT ("householdId", "userId") DO UPDATE SET role = 'OWNER';
  END IF;

  INSERT INTO "BudgetCategory" (id, "householdId", name, kind, color, icon, "monthlyCap", "createdAt", "updatedAt")
  VALUES
    ('seed-cat-housing', v_household_id, 'Housing', 'FIXED', '#0f766e', 'home', 3200, now(), now()),
    ('seed-cat-groceries', v_household_id, 'Groceries', 'FLEXIBLE', '#2563eb', 'shopping-cart', 950, now(), now()),
    ('seed-cat-restaurants', v_household_id, 'Restaurants', 'FLEXIBLE', '#dc2626', 'utensils', 425, now(), now()),
    ('seed-cat-transportation', v_household_id, 'Transportation', 'FLEXIBLE', '#9333ea', 'car', 450, now(), now()),
    ('seed-cat-utilities', v_household_id, 'Utilities', 'FIXED', '#b45309', 'zap', 420, now(), now()),
    ('seed-cat-health', v_household_id, 'Health', 'FLEXIBLE', '#be185d', 'heart-pulse', 300, now(), now()),
    ('seed-cat-travel', v_household_id, 'Travel', 'FLEXIBLE', '#0369a1', 'plane', 700, now(), now()),
    ('seed-cat-savings', v_household_id, 'Savings', 'SAVINGS', '#15803d', 'piggy-bank', 2500, now(), now()),
    ('seed-cat-income', v_household_id, 'Income', 'INCOME', '#047857', 'banknote', 0, now(), now())
  ON CONFLICT ("householdId", name) DO UPDATE SET
    kind = EXCLUDED.kind,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon,
    "monthlyCap" = EXCLUDED."monthlyCap",
    "updatedAt" = now();

  INSERT INTO "MonthlyBudget" (id, "householdId", "categoryId", month, planned)
  SELECT
    'seed-budget-' || c.id,
    v_household_id,
    c.id,
    v_month,
    c."monthlyCap"
  FROM "BudgetCategory" c
  WHERE c."householdId" = v_household_id
    AND c.kind <> 'INCOME'
    AND c."monthlyCap" IS NOT NULL
  ON CONFLICT ("categoryId", month) DO UPDATE SET planned = EXCLUDED.planned;

  INSERT INTO "FinancialAccount" (
    id, "householdId", "plaidAccountId", name, "officialName", type, subtype, mask,
    "currentBalance", "availableBalance", "createdAt", "updatedAt"
  )
  VALUES
    ('seed-account-checking', v_household_id, 'seed-checking', 'Household Checking', 'Seed Household Checking', 'depository', 'checking', '0420', 8420.55, 8120.55, now(), now()),
    ('seed-account-savings', v_household_id, 'seed-savings', 'Emergency Savings', 'Seed Emergency Savings', 'depository', 'savings', '1206', 18750, 18750, now(), now())
  ON CONFLICT ("plaidAccountId") DO UPDATE SET
    "householdId" = EXCLUDED."householdId",
    name = EXCLUDED.name,
    "officialName" = EXCLUDED."officialName",
    type = EXCLUDED.type,
    subtype = EXCLUDED.subtype,
    mask = EXCLUDED.mask,
    "currentBalance" = EXCLUDED."currentBalance",
    "availableBalance" = EXCLUDED."availableBalance",
    "updatedAt" = now();

  INSERT INTO "Transaction" (
    id, "householdId", "accountId", "categoryId", "plaidTransactionId", date, name,
    "merchantName", amount, "isBurst", notes, "createdAt", "updatedAt"
  )
  SELECT
    'seed-txn-' || t.key,
    v_household_id,
    CASE WHEN t.key IN ('brokerage', '529') THEN 'seed-account-savings' ELSE 'seed-account-checking' END,
    c.id,
    'seed-' || t.key,
    v_month + ((t.day - 1) || ' days')::interval,
    t.name,
    t.merchant_name,
    t.amount,
    t.is_burst,
    '[seed] realistic local demo transaction',
    now(),
    now()
  FROM (
    VALUES
      ('monthly-paycheck', -6250.00, 'Payroll deposit', 'BFC Labs Payroll', 'Income', 2, false),
      ('mortgage', 3150.00, 'Mortgage payment', 'First Home Mortgage', 'Housing', 3, false),
      ('whole-foods', 184.72, 'Whole Foods Market', 'Whole Foods', 'Groceries', 4, false),
      ('trader-joes', 96.41, 'Trader Joe''s', 'Trader Joe''s', 'Groceries', 7, false),
      ('costco', 221.19, 'Costco Wholesale', 'Costco', 'Groceries', 11, false),
      ('local-restaurant', 86.34, 'Dinner downtown', 'Little Star', 'Restaurants', 6, false),
      ('coffee', 18.90, 'Coffee meeting', 'Blue Bottle Coffee', 'Restaurants', 8, false),
      ('electric', 142.56, 'Electric bill', 'Utility Electric', 'Utilities', 9, false),
      ('internet', 79.99, 'Fiber internet', 'FiberNet', 'Utilities', 12, false),
      ('gas', 62.18, 'Gas station', 'Shell', 'Transportation', 5, false),
      ('pharmacy', 34.20, 'Prescription refill', 'CVS Pharmacy', 'Health', 10, false),
      ('529', 500.00, '529 contribution', 'College Savings Plan', 'Savings', 13, false),
      ('brokerage', 1500.00, 'Brokerage transfer', 'Vanguard', 'Savings', 14, false),
      ('weekend-flight', 628.44, 'Weekend flights', 'United Airlines', 'Travel', 15, true),
      ('appliance', 1199.00, 'Washer replacement', 'Home Depot', 'Housing', 18, true)
  ) AS t(key, amount, name, merchant_name, category_name, day, is_burst)
  JOIN "BudgetCategory" c ON c."householdId" = v_household_id AND c.name = t.category_name
  ON CONFLICT ("plaidTransactionId") DO UPDATE SET
    "householdId" = EXCLUDED."householdId",
    "accountId" = EXCLUDED."accountId",
    "categoryId" = EXCLUDED."categoryId",
    date = EXCLUDED.date,
    name = EXCLUDED.name,
    "merchantName" = EXCLUDED."merchantName",
    amount = EXCLUDED.amount,
    "isBurst" = EXCLUDED."isBurst",
    notes = EXCLUDED.notes,
    "updatedAt" = now();

  INSERT INTO "Goal" (id, "householdId", name, "targetAmount", "currentAmount", "targetDate", priority, strategy, "createdAt", "updatedAt")
  VALUES
    ('seed-emergency-fund', v_household_id, 'Emergency fund', 30000, 18750, make_date((extract(year from now())::int + 1), 12, 31), 1, 'SAVE_MONTHLY', now(), now()),
    ('seed-home-project', v_household_id, 'Kitchen refresh', 12000, 4200, make_date((extract(year from now())::int + 1), 6, 30), 2, 'SAVE_MONTHLY', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    "householdId" = EXCLUDED."householdId",
    "targetAmount" = EXCLUDED."targetAmount",
    "currentAmount" = EXCLUDED."currentAmount",
    "targetDate" = EXCLUDED."targetDate",
    priority = EXCLUDED.priority,
    strategy = EXCLUDED.strategy,
    "updatedAt" = now();

  INSERT INTO "BurstSpendingItem" (id, "householdId", name, amount, "purchaseDate", status, "fundingPlan", "createdAt", "updatedAt")
  VALUES
    ('seed-washer', v_household_id, 'Washer replacement', 1199, v_month + interval '17 days', 'APPROVED', 'Use checking buffer, then refill from next two paychecks.', now(), now()),
    ('seed-weekend-trip', v_household_id, 'Long weekend trip', 1500, v_month + interval '2 months' + interval '11 days', 'PLANNED', 'Cap restaurants for two months and use travel sinking fund.', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    "householdId" = EXCLUDED."householdId",
    amount = EXCLUDED.amount,
    "purchaseDate" = EXCLUDED."purchaseDate",
    status = EXCLUDED.status,
    "fundingPlan" = EXCLUDED."fundingPlan",
    "updatedAt" = now();

  INSERT INTO "WealthPlan" (
    id, "householdId", name, "startingNetWorth", "monthlyContribution",
    "annualReturnRate", "annualInflationRate", "horizonYears", notes, "createdAt", "updatedAt"
  )
  VALUES
    ('seed-base-plan', v_household_id, '15-year base plan', 125000, 2800, 0.06, 0.025, 15, 'Seed scenario for local planning views.', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    "householdId" = EXCLUDED."householdId",
    "startingNetWorth" = EXCLUDED."startingNetWorth",
    "monthlyContribution" = EXCLUDED."monthlyContribution",
    "annualReturnRate" = EXCLUDED."annualReturnRate",
    "annualInflationRate" = EXCLUDED."annualInflationRate",
    "horizonYears" = EXCLUDED."horizonYears",
    notes = EXCLUDED.notes,
    "updatedAt" = now();

  INSERT INTO "HouseholdInvite" (id, "householdId", email, role, "createdByUserId", "createdAt", "updatedAt")
  VALUES ('seed-spouse-invite', v_household_id, 'spouse@example.com', 'MEMBER', v_user_id, now(), now())
  ON CONFLICT ("householdId", email) DO UPDATE SET
    role = EXCLUDED.role,
    "createdByUserId" = EXCLUDED."createdByUserId",
    "updatedAt" = now();

  RAISE NOTICE 'Seeded household % for user %', v_household_id, v_user_id;
END $$;
