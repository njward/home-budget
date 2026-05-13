import { createCategory } from "@/app/actions/budget-actions";
import { AppNav } from "@/components/nav";
import { requireHousehold } from "@/lib/household";
import { dollars } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function BudgetsPage() {
  const { household, user } = await requireHousehold();
  const categories = await prisma.budgetCategory.findMany({
    where: { householdId: household.id },
    include: { transactions: true },
    orderBy: { name: "asc" }
  });

  return (
    <>
      <AppNav userName={user.name ?? user.email} />
      <main className="page">
        <div className="pageHeader">
          <div>
            <h1>Budgets</h1>
            <p>Set the normal monthly shape of spending so unusual purchases stand out clearly.</p>
          </div>
        </div>

        <section className="grid">
          <div className="panel span7">
            <h2>Categories</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th className="amount">Monthly cap</th>
                  <th className="amount">All-time tracked</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td><span className="pill">{category.name}</span></td>
                    <td>{category.kind.toLowerCase()}</td>
                    <td className="amount">{category.monthlyCap ? dollars(category.monthlyCap) : "-"}</td>
                    <td className="amount">
                      {dollars(category.transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form className="panel span5" action={createCategory}>
            <h2>Add category</h2>
            <div className="formGrid">
              <div className="field full">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" required />
              </div>
              <div className="field">
                <label htmlFor="kind">Type</label>
                <select id="kind" name="kind" defaultValue="FLEXIBLE">
                  <option value="FIXED">Fixed</option>
                  <option value="FLEXIBLE">Flexible</option>
                  <option value="SAVINGS">Savings</option>
                  <option value="INCOME">Income</option>
                  <option value="DEBT">Debt</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="monthlyCap">Monthly cap</label>
                <input id="monthlyCap" name="monthlyCap" type="number" min="0" step="0.01" />
              </div>
              <button className="button primary" type="submit">Add category</button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
