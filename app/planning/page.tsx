import { createBurstItem, createWealthPlan } from "@/app/actions/budget-actions";
import { AppNav } from "@/components/nav";
import { requireHousehold } from "@/lib/household";
import { dollars, projectWealth } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function PlanningPage() {
  const { household, user } = await requireHousehold();
  const [burstItems, plans] = await Promise.all([
    prisma.burstSpendingItem.findMany({ where: { householdId: household.id }, orderBy: { createdAt: "desc" } }),
    prisma.wealthPlan.findMany({ where: { householdId: household.id }, orderBy: { createdAt: "desc" } })
  ]);
  const activePlan = plans[0];
  const projection = activePlan
    ? projectWealth({
        startingNetWorth: Number(activePlan.startingNetWorth),
        monthlyContribution: Number(activePlan.monthlyContribution),
        annualReturnRate: Number(activePlan.annualReturnRate),
        annualInflationRate: Number(activePlan.annualInflationRate),
        horizonYears: activePlan.horizonYears
      })
    : [];

  return (
    <>
      <AppNav userName={user.name ?? user.email} />
      <main className="page">
        <div className="pageHeader">
          <div>
            <h1>Planning</h1>
            <p>Separate big purchases from normal life, then pressure-test the multi-year strategy.</p>
          </div>
        </div>

        <section className="grid">
          <div className="panel span6">
            <h2>Burst spending</h2>
            <div className="list">
              {burstItems.map((item) => (
                <div className="listItem" key={item.id}>
                  <strong>{item.name}</strong>
                  <span className="muted">
                    {dollars(item.amount)} · {item.status.toLowerCase()}
                    {item.purchaseDate ? ` · ${item.purchaseDate.toLocaleDateString()}` : ""}
                  </span>
                  {item.fundingPlan && <span>{item.fundingPlan}</span>}
                </div>
              ))}
              {burstItems.length === 0 && <p className="muted">No burst items yet.</p>}
            </div>
          </div>

          <form className="panel span6" action={createBurstItem}>
            <h2>Add burst item</h2>
            <div className="formGrid">
              <div className="field full">
                <label htmlFor="burstName">Name</label>
                <input id="burstName" name="name" required />
              </div>
              <div className="field">
                <label htmlFor="amount">Amount</label>
                <input id="amount" name="amount" type="number" min="0" step="0.01" required />
              </div>
              <div className="field">
                <label htmlFor="purchaseDate">Purchase date</label>
                <input id="purchaseDate" name="purchaseDate" type="date" />
              </div>
              <div className="field full">
                <label htmlFor="fundingPlan">Funding plan</label>
                <textarea id="fundingPlan" name="fundingPlan" rows={3} />
              </div>
              <button className="button primary" type="submit">Add item</button>
            </div>
          </form>

          <div className="panel span7">
            <h2>{activePlan?.name ?? "Wealth plan"}</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="amount">Nominal</th>
                  <th className="amount">Inflation-adjusted</th>
                </tr>
              </thead>
              <tbody>
                {projection.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td className="amount">{dollars(row.nominal)}</td>
                    <td className="amount">{dollars(row.real)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form className="panel span5" action={createWealthPlan}>
            <h2>Add scenario</h2>
            <div className="formGrid">
              <div className="field full">
                <label htmlFor="planName">Name</label>
                <input id="planName" name="name" required />
              </div>
              <div className="field">
                <label htmlFor="startingNetWorth">Starting net worth</label>
                <input id="startingNetWorth" name="startingNetWorth" type="number" min="0" step="0.01" required />
              </div>
              <div className="field">
                <label htmlFor="monthlyContribution">Monthly contribution</label>
                <input id="monthlyContribution" name="monthlyContribution" type="number" min="0" step="0.01" required />
              </div>
              <div className="field">
                <label htmlFor="annualReturnRate">Annual return %</label>
                <input id="annualReturnRate" name="annualReturnRate" type="number" min="0" max="100" step="0.1" defaultValue="6" />
              </div>
              <div className="field">
                <label htmlFor="annualInflationRate">Inflation %</label>
                <input id="annualInflationRate" name="annualInflationRate" type="number" min="0" max="100" step="0.1" defaultValue="2.5" />
              </div>
              <div className="field full">
                <label htmlFor="horizonYears">Horizon years</label>
                <input id="horizonYears" name="horizonYears" type="number" min="1" max="60" defaultValue="10" />
              </div>
              <button className="button primary" type="submit">Add scenario</button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
