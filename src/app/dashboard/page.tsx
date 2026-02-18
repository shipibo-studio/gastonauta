"use client";
import { Sidebar } from "../components/Sidebar";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700 font-sans">
      {/* Sidebar */}
      <Sidebar />
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center p-10 gap-8">
        <h1 className="text-3xl font-serif text-stone-100 mb-6 drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)]">Dashboard</h1>
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Placeholder cards for charts */}
          <section className="rounded-2xl bg-white/10 dark:bg-stone-900/40 backdrop-blur-xl border border-stone-300/20 dark:border-stone-700/40 shadow-xl p-8 flex flex-col items-center justify-center min-h-[220px]">
            <span className="text-stone-200 font-sans mb-2">Gráfico 1</span>
            <div className="w-full h-32 bg-cyan-400/10 rounded-lg border border-cyan-400/20 flex items-center justify-center text-cyan-400 font-bold text-lg animate-pulse">[Placeholder]</div>
          </section>
          <section className="rounded-2xl bg-white/10 dark:bg-stone-900/40 backdrop-blur-xl border border-stone-300/20 dark:border-stone-700/40 shadow-xl p-8 flex flex-col items-center justify-center min-h-[220px]">
            <span className="text-stone-200 font-sans mb-2">Gráfico 2</span>
            <div className="w-full h-32 bg-pink-400/10 rounded-lg border border-pink-400/20 flex items-center justify-center text-pink-400 font-bold text-lg animate-pulse">[Placeholder]</div>
          </section>
        </div>
      </main>
    </div>
  );
}
