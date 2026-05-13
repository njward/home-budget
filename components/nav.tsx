import Link from "next/link";
import { Banknote, ChartNoAxesCombined, Gauge, PiggyBank, ReceiptText, Users } from "lucide-react";
import { SignOutButton } from "@/components/auth-buttons";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/budgets", label: "Budgets", icon: Banknote },
  { href: "/goals", label: "Goals", icon: PiggyBank },
  { href: "/planning", label: "Planning", icon: ChartNoAxesCombined },
  { href: "/household", label: "Household", icon: Users }
];

export function AppNav({ userName }: { userName?: string | null }) {
  return (
    <header className="appHeader">
      <Link className="brand" href="/dashboard">
        Home Budget
      </Link>
      <nav className="navLinks">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link href={link.href} key={link.href}>
              <Icon size={17} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="headerUser">
        <span>{userName}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
