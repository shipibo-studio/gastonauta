"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function WebhookDebugPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any[]>([]);

  // Proteger la página
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/");
      }
    });
  }, [router]);

  // Obtener todos los datos recibidos
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const { data, error } = await supabase.from("data").select("*").order("id", { ascending: false });
        if (error) setError(error.message);
        else setData(data || []);
      } catch (err: any) {
        setError(err.message || "Error al cargar datos");
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700 font-sans p-8">
      <h1 className="text-2xl font-serif text-cyan-400 mb-6 drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)]">Webhook Debug</h1>
      {loading && <div className="text-stone-400 animate-pulse mb-4">Cargando datos...</div>}
      {error && <div className="text-pink-400 text-sm mb-4">{error}</div>}
      <pre className="bg-stone-900/60 text-stone-100 rounded-lg p-4 w-full max-w-xl overflow-x-auto border border-stone-700/40 shadow-xl text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
