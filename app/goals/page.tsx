import { createGoal } from "@/app/actions/budget-actions";
import { AppNav } from "@/components/nav";
import { requireHousehold } from "@/lib/household";
import { dollars } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function GoalsPage() {
  const { household, user } = await requireHousehold();
  const goals = await prisma.goal.findMany({
    where: { householdId: household.id },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
  });

  return (
    <>
      <AppNav userName={user.name ?? user.email} />
      <main className="page">
        <div className="pageHeader">
          <div>
            <h1>Goals</h1>
            <p>Track shared targets and the monthly savings pressure needed to reach them.</p>
          </div>
        </div>

        <section className="grid">
          <div className="panel span7">
            <h2>Goal stack</h2>
            <div className="list">
              {goals.map((goal) => {
                const progress = Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100);
                const remaining = Number(goal.targetAmount) - Number(goal.currentAmount);
                return (
                  <div className="listItem" key={goal.id}>
                    <strong>{goal.name}</strong>
                    <div className="bar">
                      <span style={{ "--progress": `${progress}%` } as React.CSSProperties} />
                    </div>
                    <span className="muted">
                      {dollars(goal.currentAmount)} saved, {dollars(Math.max(0, remaining))} remaining
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <form className="panel span5" action={createGoal}>
            <h2>Add goal</h2>
            <div className="formGrid">
              <div className="field full">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" required />
              </div>
              <div className="field">
                <label htmlFor="targetAmount">Target</label>
                <input id="targetAmount" name="targetAmount" type="number" min="0" step="0.01" required />
              </div>
              <div className="field">
                <label htmlFor="currentAmount">Saved</label>
                <input id="currentAmount" name="currentAmount" type="number" min="0" step="0.01" defaultValue="0" />
              </div>
              <div className="field full">
                <label htmlFor="targetDate">Target date</label>
                <input id="targetDate" name="targetDate" type="date" />
              </div>
              <button className="button primary" type="submit">Add goal</button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
