"use client";
import { useState } from "react";

export default function WebhookDebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleWebhookTest() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/save-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: "webhook", timestamp: Date.now() }),
      });
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Error al enviar webhook");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700 font-sans p-8">
      <h1 className="text-2xl font-serif text-cyan-400 mb-6 drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)]">Webhook Debug</h1>
      <button
        className="bg-cyan-400/80 hover:bg-cyan-400 text-stone-900 font-bold rounded-lg py-2 px-6 shadow-cyan-400/60 drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)] cursor-pointer focus:ring focus:border-cyan-400 transition mb-6"
        onClick={handleWebhookTest}
        disabled={loading}
      >
        {loading ? "Enviando..." : "Enviar webhook de prueba"}
      </button>
      {error && <div className="text-pink-400 text-sm mb-4">{error}</div>}
      {result && (
        <pre className="bg-stone-900/60 text-stone-100 rounded-lg p-4 w-full max-w-xl overflow-x-auto border border-stone-700/40 shadow-xl text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
