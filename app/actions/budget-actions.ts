"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireHousehold } from "@/lib/household";
import { parseCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

const money = z.coerce.number().finite().nonnegative();

const simplifiCategoryMap: Array<[string, string]> = [
  ["Personal Income", "Income"],
  ["Dining & Drinks", "Restaurants"],
  ["Shopping", "Groceries"],
  ["Groceries", "Groceries"],
  ["Utilities", "Utilities"],
  ["Auto & Transport", "Transportation"],
  ["Transportation", "Transportation"],
  ["Education", "Savings"],
  ["Healthcare", "Health"],
  ["Health", "Health"],
  ["Travel", "Travel"],
  ["Entertainment", "Restaurants"]
];

function fingerprint(values: Array<string | number>) {
  return createHash("sha256").update(values.join("|")).digest("hex").slice(0, 32);
}

function categoryKindForName(name: string) {
  if (name === "Income") return "INCOME";
  if (name === "Savings") return "SAVINGS";
  if (["Housing", "Utilities"].includes(name)) return "FIXED";
  return "FLEXIBLE";
}

function mapSimplifiCategory(category: string) {
  const match = simplifiCategoryMap.find(([prefix]) => category.startsWith(prefix));
  return match?.[1] ?? category.split(":")[0]?.trim() ?? "Uncategorized";
}

function parseSimplifiDate(value: string) {
  const date = new Date(`${value.trim()} 12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Could not parse date: ${value}`);
  }
  return date;
}

function parseSimplifiAmount(value: string) {
  const cleaned = value.replace(/[$,]/g, "").trim();
  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) {
    throw new Error(`Could not parse amount: ${value}`);
  }

  return -amount;
}

function requireOwner(role: string) {
  if (role !== "OWNER") {
    throw new Error("Only household owners can manage invitations.");
  }
}

export async function createHouseholdInvite(formData: FormData) {
  const { household, membership, user } = await requireHousehold();
  requireOwner(membership.role);

  const payload = z
    .object({
      email: z.string().email().transform((email) => email.toLowerCase()),
      role: z.enum(["OWNER", "MEMBER"]).default("MEMBER")
    })
    .parse({
      email: formData.get("email"),
      role: formData.get("role") || "MEMBER"
    });

  await prisma.householdInvite.upsert({
    where: {
      householdId_email: {
        householdId: household.id,
        email: payload.email
      }
    },
    update: {
      role: payload.role,
      acceptedAt: null,
      createdByUserId: user.id
    },
    create: {
      householdId: household.id,
      email: payload.email,
      role: payload.role,
      createdByUserId: user.id
    }
  });

  revalidatePath("/household");
}

export async function removeHouseholdInvite(formData: FormData) {
  const { household, membership } = await requireHousehold();
  requireOwner(membership.role);

  const payload = z
    .object({
      inviteId: z.string()
    })
    .parse({
      inviteId: formData.get("inviteId")
    });

  await prisma.householdInvite.deleteMany({
    where: {
      id: payload.inviteId,
      householdId: household.id,
      acceptedAt: null
    }
  });

  revalidatePath("/household");
}

export async function importSimplifiTransactions(formData: FormData) {
  const { household } = await requireHousehold();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a Simplifi CSV file to import.");
  }

  const text = await file.text();
  const rows = parseCsv(text);
  const [headers, ...records] = rows;
  const headerMap = new Map(headers.map((header, index) => [header.trim().toLowerCase(), index]));
  const requiredHeaders = ["date", "account", "payee", "category", "exclusion", "amount"];

  for (const header of requiredHeaders) {
    if (!headerMap.has(header)) {
      throw new Error(`Missing expected Simplifi column: ${header}`);
    }
  }

  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    const dateText = record[headerMap.get("date") ?? 0]?.trim();
    const accountName = record[headerMap.get("account") ?? 1]?.trim();
    const payee = record[headerMap.get("payee") ?? 2]?.trim();
    const sourceCategory = record[headerMap.get("category") ?? 3]?.trim();
    const exclusion = record[headerMap.get("exclusion") ?? 4]?.trim().toLowerCase();
    const amountText = record[headerMap.get("amount") ?? 5]?.trim();

    if (!dateText || !accountName || !payee || !amountText || exclusion === "yes") {
      skipped += 1;
      continue;
    }

    const date = parseSimplifiDate(dateText);
    const amount = parseSimplifiAmount(amountText);
    const categoryName = mapSimplifiCategory(sourceCategory);
    const importId = `simplifi:${fingerprint([dateText, accountName, payee, sourceCategory, amountText])}`;

    const account = await prisma.financialAccount.upsert({
      where: { plaidAccountId: `simplifi:${accountName}` },
      update: {
        householdId: household.id,
        name: accountName,
        type: "manual",
        subtype: "simplifi"
      },
      create: {
        householdId: household.id,
        plaidAccountId: `simplifi:${accountName}`,
        name: accountName,
        type: "manual",
        subtype: "simplifi"
      }
    });

    const category = await prisma.budgetCategory.upsert({
      where: {
        householdId_name: {
          householdId: household.id,
          name: categoryName
        }
      },
      update: {},
      create: {
        householdId: household.id,
        name: categoryName,
        kind: categoryKindForName(categoryName)
      }
    });

    await prisma.transaction.upsert({
      where: { importId },
      update: {
        householdId: household.id,
        accountId: account.id,
        categoryId: category.id,
        date,
        name: payee,
        merchantName: payee,
        amount,
        notes: `[Simplifi] ${sourceCategory}`
      },
      create: {
        householdId: household.id,
        accountId: account.id,
        categoryId: category.id,
        importId,
        date,
        name: payee,
        merchantName: payee,
        amount,
        notes: `[Simplifi] ${sourceCategory}`
      }
    });

    imported += 1;
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");

  console.info(`Imported Simplifi CSV rows: ${imported}; skipped: ${skipped}`);
}

export async function createCategory(formData: FormData) {
  const { household } = await requireHousehold();
  const payload = z
    .object({
      name: z.string().min(2),
      kind: z.enum(["FIXED", "FLEXIBLE", "SAVINGS", "INCOME", "DEBT"]),
      monthlyCap: money.optional()
    })
    .parse({
      name: formData.get("name"),
      kind: formData.get("kind"),
      monthlyCap: formData.get("monthlyCap") || undefined
    });

  await prisma.budgetCategory.create({
    data: {
      householdId: household.id,
      name: payload.name,
      kind: payload.kind,
      monthlyCap: payload.monthlyCap ?? null
    }
  });

  revalidatePath("/budgets");
}

export async function createGoal(formData: FormData) {
  const { household } = await requireHousehold();
  const payload = z
    .object({
      name: z.string().min(2),
      targetAmount: money,
      currentAmount: money.default(0),
      targetDate: z.string().optional()
    })
    .parse({
      name: formData.get("name"),
      targetAmount: formData.get("targetAmount"),
      currentAmount: formData.get("currentAmount") || 0,
      targetDate: formData.get("targetDate") || undefined
    });

  await prisma.goal.create({
    data: {
      householdId: household.id,
      name: payload.name,
      targetAmount: payload.targetAmount,
      currentAmount: payload.currentAmount,
      targetDate: payload.targetDate ? new Date(payload.targetDate) : null
    }
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function createBurstItem(formData: FormData) {
  const { household } = await requireHousehold();
  const payload = z
    .object({
      name: z.string().min(2),
      amount: money,
      purchaseDate: z.string().optional(),
      fundingPlan: z.string().optional()
    })
    .parse({
      name: formData.get("name"),
      amount: formData.get("amount"),
      purchaseDate: formData.get("purchaseDate") || undefined,
      fundingPlan: formData.get("fundingPlan") || undefined
    });

  await prisma.burstSpendingItem.create({
    data: {
      householdId: household.id,
      name: payload.name,
      amount: payload.amount,
      purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : null,
      fundingPlan: payload.fundingPlan
    }
  });

  revalidatePath("/planning");
  revalidatePath("/dashboard");
}

export async function createWealthPlan(formData: FormData) {
  const { household } = await requireHousehold();
  const payload = z
    .object({
      name: z.string().min(2),
      startingNetWorth: money,
      monthlyContribution: money,
      annualReturnRate: z.coerce.number().min(0).max(1),
      annualInflationRate: z.coerce.number().min(0).max(1),
      horizonYears: z.coerce.number().int().min(1).max(60)
    })
    .parse({
      name: formData.get("name"),
      startingNetWorth: formData.get("startingNetWorth"),
      monthlyContribution: formData.get("monthlyContribution"),
      annualReturnRate: Number(formData.get("annualReturnRate")) / 100,
      annualInflationRate: Number(formData.get("annualInflationRate")) / 100,
      horizonYears: formData.get("horizonYears")
    });

  await prisma.wealthPlan.create({
    data: {
      householdId: household.id,
      ...payload
    }
  });

  revalidatePath("/planning");
}

export async function updateTransaction(formData: FormData) {
  const { household } = await requireHousehold();
  const payload = z
    .object({
      transactionId: z.string(),
      categoryId: z.string().optional(),
      isBurst: z.boolean()
    })
    .parse({
      transactionId: formData.get("transactionId"),
      categoryId: formData.get("categoryId") || undefined,
      isBurst: formData.get("isBurst") === "on"
    });

  await prisma.transaction.updateMany({
    where: {
      id: payload.transactionId,
      householdId: household.id
    },
    data: {
      categoryId: payload.categoryId ?? null,
      isBurst: payload.isBurst
    }
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
