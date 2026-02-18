"use client";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fadeOut, setFadeOut] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value.trim();
    if (!email || !password) {
      form.reportValidity();
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setFadeOut(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 600);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700 font-sans relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl opacity-70 animate-pulse shadow-[0_0_80px_20px_rgba(34,211,238,0.25)]" />
      </div>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`relative z-10 w-full max-w-sm rounded-2xl bg-white/10 dark:bg-stone-900/40 backdrop-blur-xl shadow-2xl p-10 flex flex-col gap-8 border border-stone-300/20 dark:border-stone-700/40 font-sans transition-all duration-500 ${fadeOut ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}`}
        autoComplete="off"
      >
        <h1 className="text-3xl font-semibold text-stone-100 text-center font-serif drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)] tracking-tight">Iniciar sesión</h1>
        <div className="flex flex-col gap-4">
          <label htmlFor="email" className="text-stone-200 text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-lg border border-stone-300/30 bg-stone-100/40 dark:bg-stone-900/60 px-4 py-2 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition shadow-inner backdrop-blur-md"
            placeholder="tucorreo@email.com"
          />
        </div>
        <div className="flex flex-col gap-4">
          <label htmlFor="password" className="text-stone-200 text-sm font-medium">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-lg border border-stone-300/30 bg-stone-100/40 dark:bg-stone-900/60 px-4 py-2 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition shadow-inner backdrop-blur-md"
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" className="w-full bg-cyan-400/80 text-stone-900 font-semibold shadow-[0_2px_24px_0_rgba(34,211,238,0.4)] hover:bg-cyan-300/90 hover:shadow-cyan-400/60 transition-all border-2 border-cyan-300/40 backdrop-blur-sm hover:cursor-pointer" disabled={loading}>
          {loading ? "Ingresando..." : "Entrar"}
        </Button>
        {error && <div className="text-pink-400 text-sm mt-2 text-center">{error}</div>}
      </form>
    </div>
  );
}
