"use client";

import { useEffect, useState } from "react";
import { Link2, RefreshCcw } from "lucide-react";

declare global {
  interface Window {
    Plaid?: {
      create(options: {
        token: string;
        onSuccess(publicToken: string, metadata: { institution?: { name?: string } }): void;
        onExit?(
          error: {
            error_code?: string;
            error_message?: string;
            error_type?: string;
            display_message?: string;
          } | null,
          metadata: { institution?: { name?: string }; status?: string; link_session_id?: string }
        ): void;
        onEvent?(
          eventName: string,
          metadata: {
            error_code?: string;
            error_message?: string;
            error_type?: string;
            institution_name?: string;
            link_session_id?: string;
          }
        ): void;
      }): { open(): void };
    };
  }
}

export function PlaidConnect() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reportLinkEvent(eventName: string, payload: unknown) {
    const body = JSON.stringify({ eventName, payload });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/plaid/link-event", new Blob([body], { type: "application/json" }));
      return;
    }

    fetch("/api/plaid/link-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    }).catch(() => {});
  }

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
    setError(null);
    const linkTokenResponse = await fetch("/api/plaid/create-link-token", { method: "POST" });
    if (!linkTokenResponse.ok) {
      setBusy(false);
      setError("Plaid could not create a connection session. Check the server log for details.");
      return;
    }

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
      },
      onExit(linkError, metadata) {
        setBusy(false);
        if (!linkError) {
          return;
        }

        console.error("Plaid Link exited with an error", { linkError, metadata });
        reportLinkEvent("EXIT", { linkError, metadata });
        setError(
          [
            linkError.display_message,
            linkError.error_message,
            linkError.error_code ? `Code: ${linkError.error_code}` : null
          ]
            .filter(Boolean)
            .join(" ")
        );
      },
      onEvent(eventName, metadata) {
        reportLinkEvent(eventName, metadata);
        if (metadata.error_code || metadata.error_message) {
          console.warn("Plaid Link event", eventName, metadata);
        }
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
    <div className="stack">
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
      {error && <p className="inlineError">{error}</p>}
    </div>
  );
}
