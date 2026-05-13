import { AppNav } from "@/components/nav";
import { PlaidConnect } from "@/components/plaid-connect";
import { importSimplifiTransactions, updateTransaction } from "@/app/actions/budget-actions";
import { requireHousehold } from "@/lib/household";
import { dollars } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function TransactionsPage() {
  const { household, user } = await requireHousehold();
  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { householdId: household.id },
      include: { account: true, category: true },
      orderBy: { date: "desc" },
      take: 100
    }),
    prisma.budgetCategory.findMany({
      where: { householdId: household.id },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <>
      <AppNav userName={user.name ?? user.email} />
      <main className="page">
        <div className="pageHeader">
          <div>
            <h1>Transactions</h1>
            <p>Review imports, assign budget categories, and flag spending that should live outside the regular month.</p>
          </div>
          <PlaidConnect />
        </div>

        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Import CSV</h2>
              <p className="muted">Upload a Quicken Simplifi transactions export. Excluded rows are skipped.</p>
            </div>
            <form action={importSimplifiTransactions} className="inlineUpload">
              <input aria-label="Simplifi CSV file" name="file" required type="file" accept=".csv,text/csv" />
              <button className="button" type="submit">Import Simplifi CSV</button>
            </form>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Account</th>
                <th>Category</th>
                <th>Burst</th>
                <th className="amount">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.date.toLocaleDateString()}</td>
                  <td>
                    <strong>{transaction.merchantName ?? transaction.name}</strong>
                    {transaction.pending && <span className="pill">Pending</span>}
                  </td>
                  <td>{transaction.account?.name ?? "Manual"}</td>
                  <td colSpan={3}>
                    <form className="buttonRow" action={updateTransaction}>
                      <input type="hidden" name="transactionId" value={transaction.id} />
                      <select name="categoryId" defaultValue={transaction.categoryId ?? ""} aria-label="Category">
                        <option value="">Uncategorized</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <label className="iconText">
                        <input type="checkbox" name="isBurst" defaultChecked={transaction.isBurst} />
                        Burst
                      </label>
                      <button className="button" type="submit">
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="amount">{dollars(transaction.amount)}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td className="muted" colSpan={7}>No transactions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
