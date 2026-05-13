"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireHousehold } from "@/lib/household";
import { prisma } from "@/lib/prisma";

const money = z.coerce.number().finite().nonnegative();

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
