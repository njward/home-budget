import { NextResponse } from "next/server";
import { requireHousehold } from "@/lib/household";
import { plaid } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const { household } = await requireHousehold();
  const items = await prisma.plaidItem.findMany({
    where: { householdId: household.id }
  });

  let imported = 0;
  let modified = 0;
  let removed = 0;

  for (const item of items) {
    let cursor = item.cursor ?? undefined;
    let hasMore = true;
    let nextCursor = cursor;

    while (hasMore) {
      const sync = await plaid.transactionsSync({
        access_token: item.accessToken,
        cursor,
        count: 500
      });

      for (const transaction of sync.data.added) {
        const account = await prisma.financialAccount.findUnique({
          where: { plaidAccountId: transaction.account_id }
        });

        await prisma.transaction.upsert({
          where: { plaidTransactionId: transaction.transaction_id },
          update: {
            date: new Date(transaction.date),
            name: transaction.name,
            merchantName: transaction.merchant_name,
            amount: transaction.amount,
            pending: transaction.pending,
            accountId: account?.id
          },
          create: {
            householdId: household.id,
            accountId: account?.id,
            plaidTransactionId: transaction.transaction_id,
            date: new Date(transaction.date),
            name: transaction.name,
            merchantName: transaction.merchant_name,
            amount: transaction.amount,
            isoCurrencyCode: transaction.iso_currency_code ?? "USD",
            pending: transaction.pending
          }
        });
        imported += 1;
      }

      for (const transaction of sync.data.modified) {
        await prisma.transaction.updateMany({
          where: { plaidTransactionId: transaction.transaction_id, householdId: household.id },
          data: {
            date: new Date(transaction.date),
            name: transaction.name,
            merchantName: transaction.merchant_name,
            amount: transaction.amount,
            pending: transaction.pending
          }
        });
        modified += 1;
      }

      for (const transaction of sync.data.removed) {
        await prisma.transaction.deleteMany({
          where: { plaidTransactionId: transaction.transaction_id, householdId: household.id }
        });
        removed += 1;
      }

      hasMore = sync.data.has_more;
      nextCursor = sync.data.next_cursor;
      cursor = nextCursor;
    }

    await prisma.plaidItem.update({
      where: { id: item.id },
      data: { cursor: nextCursor }
    });
  }

  return NextResponse.json({ imported, modified, removed });
}
