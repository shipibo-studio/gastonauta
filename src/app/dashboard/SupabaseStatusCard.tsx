"use client";
import { useEffect, useState } from "react";
import { checkSupabaseStatus } from "../../lib/supabase";

export function SupabaseStatusCard() {
  const [status, setStatus] = useState<{ online: boolean; message: string } | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      const result = await checkSupabaseStatus();
      setStatus(result);
    }
    fetchStatus();
  }, []);

  return (
    <section className="rounded-2xl bg-white/10 dark:bg-stone-900/40 backdrop-blur-xl border border-stone-300/20 dark:border-stone-700/40 shadow-xl p-4 flex flex-col items-start justify-center min-h-[56px] w-fit">
      <span className="flex items-center gap-2 text-stone-200 font-sans">
        {/* Pill status */}
        {status === null ? (
          <span className="w-4 h-4 rounded-full bg-stone-400 animate-pulse border border-stone-500" />
        ) : status.online ? (
          <span className="w-4 h-4 rounded-full bg-green-400 shadow-cyan-400/60 border border-green-500" />
        ) : (
          <span className="w-4 h-4 rounded-full bg-pink-400 shadow-pink-400/60 border border-pink-500" />
        )}
        Supabase Status
      </span>
      <span className="text-xs text-stone-400 mt-1 ml-6">{status?.message}</span>
    </section>
  );
}
