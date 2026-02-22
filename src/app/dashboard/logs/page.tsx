"use client";

import { Sidebar } from "../../components/Sidebar";

export default function LogsPage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
        <h1 className="text-3xl font-serif text-stone-100 drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)]">
          Logs de Transacciones
        </h1>
      {/* Logs */}
      </main>
    </div>
  );
}
