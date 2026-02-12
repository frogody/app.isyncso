/**
 * ShopifyCallback — OAuth callback handler page
 *
 * Shopify redirects here after OAuth authorization.
 * Extracts code/shop/state/hmac from URL and forwards to
 * the shopify-api edge function to complete the token exchange.
 */

import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function ShopifyCallback() {
  const [status, setStatus] = useState("processing"); // processing | success | error
  const [message, setMessage] = useState("Completing Shopify authorization...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const shop = params.get("shop");
    const state = params.get("state");
    const hmac = params.get("hmac");

    if (!code || !shop || !state) {
      setStatus("error");
      setMessage("Missing required OAuth parameters. Please try connecting again.");
      return;
    }

    (async () => {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/shopify-api`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: "handleOAuthCallback",
            code,
            shop,
            state,
            hmac,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setStatus("success");
          setMessage("Connected to Shopify! You can close this window.");
          // Auto-close popup after brief delay
          setTimeout(() => {
            if (window.opener) {
              window.close();
            }
          }, 2000);
        } else {
          setStatus("error");
          setMessage(result.error || "Failed to complete Shopify authorization.");
        }
      } catch (err) {
        setStatus("error");
        setMessage(err.message || "An unexpected error occurred.");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-4 p-8">
        {status === "processing" && (
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
        )}
        {status === "success" && (
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
        )}
        {status === "error" && (
          <XCircle className="w-10 h-10 text-red-400 mx-auto" />
        )}
        <p className={`text-sm ${
          status === "success" ? "text-green-400" : status === "error" ? "text-red-400" : "text-zinc-300"
        }`}>
          {message}
        </p>
        {status === "error" && (
          <button
            onClick={() => window.close()}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline"
          >
            Close this window
          </button>
        )}
      </div>
    </div>
  );
}
