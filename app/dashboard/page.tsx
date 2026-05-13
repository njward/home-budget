import { AppNav } from "@/components/nav";
import { PlaidConnect } from "@/components/plaid-connect";
import { requireHousehold } from "@/lib/household";
import { dollars, currentMonth, monthLabel } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { household, user } = await requireHousehold();
  const month = currentMonth();
  const [transactions, goals, burstItems, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where: { householdId: household.id, date: { gte: month } },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 8
    }),
    prisma.goal.findMany({ where: { householdId: household.id }, orderBy: { priority: "asc" } }),
    prisma.burstSpendingItem.findMany({ where: { householdId: household.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.financialAccount.findMany({ where: { householdId: household.id }, orderBy: { name: "asc" } })
  ]);

  const spending = transactions
    .filter((transaction) => Number(transaction.amount) > 0 && transaction.category?.kind !== "INCOME")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const income = transactions
    .filter((transaction) => transaction.category?.kind === "INCOME" || Number(transaction.amount) < 0)
    .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0);
  const totalBalances = accounts.reduce((sum, account) => sum + Number(account.currentBalance ?? 0), 0);

  return (
    <>
      <AppNav userName={user.name ?? user.email} />
      <main className="page">
        <div className="pageHeader">
          <div>
            <h1>{monthLabel(month)}</h1>
            <p>Monthly cash flow, connected accounts, and the next decisions worth talking about.</p>
          </div>
          <PlaidConnect />
        </div>

        <section className="grid">
          <div className="panel span4">
            <p className="muted">Month spending</p>
            <div className="metric">{dollars(spending)}</div>
          </div>
          <div className="panel span4">
            <p className="muted">Tracked income</p>
            <div className="metric">{dollars(income)}</div>
          </div>
          <div className="panel span4">
            <p className="muted">Connected balances</p>
            <div className="metric">{dollars(totalBalances)}</div>
          </div>

          <div className="panel span7">
            <h2>Recent transactions</h2>
            <table className="table">
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.name}</td>
                    <td>{transaction.category?.name ?? "Uncategorized"}</td>
                    <td className="amount">{dollars(transaction.amount)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td className="muted">Connect an account or import transactions to start the ledger.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="panel span5">
            <h2>Goals and burst items</h2>
            <div className="list">
              {goals.slice(0, 3).map((goal) => {
                const progress = Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100);
                return (
                  <div className="listItem" key={goal.id}>
                    <strong>{goal.name}</strong>
                    <div className="bar" aria-label={`${Math.round(progress)}% complete`}>
                      <span style={{ "--progress": `${progress}%` } as React.CSSProperties} />
                    </div>
                    <span className="muted">
                      {dollars(goal.currentAmount)} of {dollars(goal.targetAmount)}
                    </span>
                  </div>
                );
              })}
              {burstItems.map((item) => (
                <div className="listItem" key={item.id}>
                  <strong>{item.name}</strong>
                  <span className="muted">{dollars(item.amount)} outside the regular budget</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
