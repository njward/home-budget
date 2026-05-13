import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth-buttons";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="landing">
      <section className="landingCopy">
        <h1>Home Budget</h1>
        <p>
          A private household money system for monthly spending, big one-off purchases, shared goals,
          and the longer wealth-building plan.
        </p>
      </section>
      <aside className="signinPanel">
        <h2>Use your Google account</h2>
        <p className="muted">
          Sign in to create your household workspace. Add your wife later by allowing her Google account
          into the same household.
        </p>
        <SignInButton />
      </aside>
    </main>
  );
}
