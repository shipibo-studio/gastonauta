"use client";
import { Sidebar } from "../components/Sidebar";
import { SupabaseStatusCard } from "./SupabaseStatusCard";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [dailyExpenses, setDailyExpenses] = useState<{ day: number; amount: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
      }
    });
  }, [router]);

  useEffect(() => {
    fetchDailyExpenses();
  }, []);

  async function fetchDailyExpenses() {
    setChartLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("transactions")
        .select("transaction_date, amount")
        .gte("transaction_date", firstDay)
        .lte("transaction_date", lastDay)
        .not("amount", "is", null);
      
      if (error) throw error;
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dailyMap: { [key: number]: number } = {};
      
      for (let i = 1; i <= daysInMonth; i++) {
        dailyMap[i] = 0;
      }
      
      data?.forEach(tx => {
        if (tx.transaction_date && tx.amount) {
          const day = new Date(tx.transaction_date).getDate();
          dailyMap[day] = (dailyMap[day] || 0) + tx.amount;
        }
      });
      
      const result = Object.entries(dailyMap).map(([day, amount]) => ({
        day: parseInt(day),
        amount
      }));
      
      setDailyExpenses(result);
    } catch (err) {
      console.error("Error fetching daily expenses:", err);
    } finally {
      setChartLoading(false);
    }
  }
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700 font-sans">
      {/* Sidebar */}
      <Sidebar />
      {/* Main content */}
      <main className="flex-1 flex flex-col p-6">
        <h1 className="text-3xl font-serif text-stone-100 mb-6 drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)]">Dashboard</h1>
        <div className="w-full grid grid-cols-1 gap-8">
          {/* Gráfico 1: Gastos por día del mes actual */}
          <section className="rounded-2xl bg-white/10 dark:bg-stone-900/40 backdrop-blur-xl border border-stone-300/20 dark:border-stone-700/40 shadow-xl p-6 flex flex-col min-h-[280px]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <span className="text-stone-200 font-sans">Gastos por día - {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</span>
            </div>
            
            {chartLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              </div>
            ) : dailyExpenses.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">
                No hay datos de gastos este mes
              </div>
            ) : (
              <>
                <div className="h-40 flex items-end gap-0.5 flex-1">
                  {dailyExpenses.map(({ day, amount }) => {
                    const maxAmount = Math.max(...dailyExpenses.map(d => d.amount), 1);
                    const height = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                    const isToday = day === new Date().getDate();
                    
                    return (
                      <div
                        key={day}
                        className="flex-1 flex flex-col items-center group relative"
                      >
                        <div className="relative w-full flex items-end justify-center h-36">
                          {amount > 0 && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900 border border-cyan-400/50 rounded px-1.5 py-0.5 text-[10px] text-cyan-400 whitespace-nowrap z-10">
                              ${amount.toLocaleString('es-CL')}
                            </div>
                          )}
                          <div
                            className={`w-full mx-px rounded-t transition-all duration-300 cursor-pointer ${
                              isToday 
                                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' 
                                : amount > 0 
                                  ? 'bg-cyan-400/60 hover:bg-cyan-400/80' 
                                  : 'bg-stone-600/30'
                            }`}
                            style={{ 
                              height: `${Math.max(height, 2)}%`,
                              minHeight: '2px'
                            }}
                          />
                        </div>
                        <span className={`text-[8px] mt-0.5 ${isToday ? 'text-cyan-400 font-bold' : 'text-stone-500'}`}>
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-stone-600/30 flex justify-between items-center text-sm">
                  <span className="text-stone-400">Total:</span>
                  <span className="text-cyan-400 font-bold">
                    ${dailyExpenses.reduce((sum, d) => sum + d.amount, 0).toLocaleString('es-CL')}
                  </span>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
