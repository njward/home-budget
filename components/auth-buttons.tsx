"use client";

import { signIn, signOut } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";

export function SignInButton() {
  return (
    <button className="button primary" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
      <LogIn size={18} />
      Sign in with Google
    </button>
  );
}

export function SignOutButton() {
  return (
    <button className="iconText" onClick={() => signOut({ callbackUrl: "/" })}>
      <LogOut size={18} />
      Sign out
    </button>
  );
}
