"use client";

import { useEffect, useState } from "react";
import { Link2, RefreshCcw } from "lucide-react";

declare global {
  interface Window {
    Plaid?: {
      create(options: {
        token: string;
        onSuccess(publicToken: string, metadata: { institution?: { name?: string } }): void;
      }): { open(): void };
    };
  }
}

export function PlaidConnect() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.Plaid) {
      setReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.async = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
  }, []);

  async function connect() {
    setBusy(true);
    const linkTokenResponse = await fetch("/api/plaid/create-link-token", { method: "POST" });
    const { linkToken } = await linkTokenResponse.json();

    window.Plaid?.create({
      token: linkToken,
      async onSuccess(publicToken, metadata) {
        await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicToken,
            institutionName: metadata.institution?.name
          })
        });
        await fetch("/api/plaid/sync", { method: "POST" });
        window.location.reload();
      }
    }).open();
    setBusy(false);
  }

  async function sync() {
    setBusy(true);
    await fetch("/api/plaid/sync", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="buttonRow">
      <button className="button primary" disabled={!ready || busy} onClick={connect}>
        <Link2 size={18} />
        Connect account
      </button>
      <button className="button" disabled={busy} onClick={sync}>
        <RefreshCcw size={18} />
        Sync
      </button>
    </div>
  );
}
