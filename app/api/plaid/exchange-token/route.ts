import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireHousehold } from "@/lib/household";
import { plaid } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";

const payloadSchema = z.object({
  publicToken: z.string(),
  institutionName: z.string().optional()
});

export async function POST(request: NextRequest) {
  const { household } = await requireHousehold();
  const payload = payloadSchema.parse(await request.json());
  const exchange = await plaid.itemPublicTokenExchange({
    public_token: payload.publicToken
  });

  const itemId = exchange.data.item_id;
  const accessToken = exchange.data.access_token;

  const plaidItem = await prisma.plaidItem.upsert({
    where: { itemId },
    update: {
      accessToken,
      institutionName: payload.institutionName
    },
    create: {
      householdId: household.id,
      itemId,
      accessToken,
      institutionName: payload.institutionName
    }
  });

  const accounts = await plaid.accountsGet({ access_token: accessToken });
  await Promise.all(
    accounts.data.accounts.map((account) =>
      prisma.financialAccount.upsert({
        where: { plaidAccountId: account.account_id },
        update: {
          name: account.name,
          officialName: account.official_name,
          type: account.type,
          subtype: account.subtype,
          mask: account.mask,
          currentBalance: account.balances.current,
          availableBalance: account.balances.available
        },
        create: {
          householdId: household.id,
          plaidItemId: plaidItem.id,
          plaidAccountId: account.account_id,
          name: account.name,
          officialName: account.official_name,
          type: account.type,
          subtype: account.subtype,
          mask: account.mask,
          currentBalance: account.balances.current,
          availableBalance: account.balances.available
        }
      })
    )
  );

  return NextResponse.json({ ok: true });
}
