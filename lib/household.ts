import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const defaultCategories = [
  ["Housing", "FIXED", "#0f766e", "home", 0],
  ["Groceries", "FLEXIBLE", "#2563eb", "shopping-cart", 900],
  ["Restaurants", "FLEXIBLE", "#dc2626", "utensils", 350],
  ["Transportation", "FLEXIBLE", "#9333ea", "car", 400],
  ["Savings", "SAVINGS", "#15803d", "piggy-bank", 1500],
  ["Income", "INCOME", "#047857", "banknote", 0]
] as const;

export async function requireHousehold() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  const existing = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: { household: true }
  });

  if (existing) {
    return {
      user: session.user,
      household: existing.household
    };
  }

  const household = await prisma.household.create({
    data: {
      name: "Home",
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER"
        }
      },
      categories: {
        create: defaultCategories.map(([name, kind, color, icon, monthlyCap]) => ({
          name,
          kind,
          color,
          icon,
          monthlyCap
        }))
      },
      goals: {
        create: [
          {
            name: "Emergency fund",
            targetAmount: 25000,
            currentAmount: 5000,
            priority: 1
          }
        ]
      },
      plans: {
        create: [
          {
            name: "10-year wealth base",
            startingNetWorth: 0,
            monthlyContribution: 2000,
            annualReturnRate: 0.06,
            annualInflationRate: 0.025,
            horizonYears: 10
          }
        ]
      }
    }
  });

  return {
    user: session.user,
    household
  };
}
