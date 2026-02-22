"use client";
import { Sidebar } from "../components/Sidebar";
import { SupabaseStatusCard } from "./SupabaseStatusCard";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { BarChart3, Calendar } from "lucide-react";

interface Category {
  id: string;
  name: string;
  total: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [dailyExpenses, setDailyExpenses] = useState<{ day: number; amount: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  
  // Month filter
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Available months (fetched from database)
  const [availableMonths, setAvailableMonths] = useState<string[]>(() => {
    // Default to Feb 2026 if no data
    return ['2026-02'];
  });

  // Category summary data
  const [categorySummary, setCategorySummary] = useState<Category[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
      }
    });
  }, [router]);

  useEffect(() => {
    fetchDailyExpenses();
    fetchCategorySummary();
    fetchAvailableMonths();
  }, []);

  useEffect(() => {
    fetchDailyExpenses();
    fetchCategorySummary();
  }, [selectedMonth]);

  async function fetchAvailableMonths() {
    try {
      // Get distinct months from transactions
      const { data, error } = await supabase
        .from('transactions')
        .select('transaction_date')
        .not('transaction_date', 'is', null);

      if (error) throw error;

      // Extract unique year-month combinations
      const monthsSet = new Set<string>();
      data?.forEach(tx => {
        if (tx.transaction_date) {
          const date = new Date(tx.transaction_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthsSet.add(monthKey);
        }
      });

      // Sort months descending
      const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
      
      // Ensure at least Feb 2026 is available
      if (!sortedMonths.includes('2026-02')) {
        sortedMonths.unshift('2026-02');
      }
      
      setAvailableMonths(sortedMonths);

      // Set default to current month or latest available
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (sortedMonths.includes(currentMonth)) {
        setSelectedMonth(currentMonth);
      } else if (sortedMonths.length > 0) {
        setSelectedMonth(sortedMonths[0]);
      }
    } catch (err) {
      console.error('Error fetching available months:', err);
    }
  }

  async function fetchDailyExpenses() {
    setChartLoading(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1).toISOString();
      const lastDay = new Date(year, month, 0, 23, 59, 59).toISOString();
      
      const { data, error } = await supabase
        .from("transactions")
        .select("transaction_date, amount")
        .gte("transaction_date", firstDay)
        .lte("transaction_date", lastDay)
        .not("amount", "is", null);
      
      if (error) throw error;
      
      const daysInMonth = new Date(year, month, 0).getDate();
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

  async function fetchCategorySummary() {
    setSummaryLoading(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      // Get all categories
      const { data: allCategories, error: catError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (catError) throw catError;

      // Get transactions for the selected month
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('category_id, amount')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .eq('is_expense', true);

      if (txError) throw txError;

      // Calculate totals per category
      const categoryTotals = new Map<string, number>();
      
      // Initialize all categories with 0
      allCategories?.forEach(cat => {
        categoryTotals.set(cat.id, 0);
      });

      // Sum up amounts per category
      transactions?.forEach(tx => {
        if (tx.category_id && tx.amount) {
          const current = categoryTotals.get(tx.category_id) || 0;
          categoryTotals.set(tx.category_id, current + tx.amount);
        }
      });

      // Build summary with all categories including $0
      const summary: Category[] = allCategories?.map(cat => ({
        id: cat.id,
        name: cat.name,
        total: categoryTotals.get(cat.id) || 0
      })) || [];

      // Sort by total descending
      summary.sort((a, b) => b.total - a.total);

      setCategorySummary(summary);
    } catch (err) {
      console.error('Error fetching category summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }

  function formatAmount(amount: number): string {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0
    }).format(amount);
  }
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700 font-sans">
      {/* Sidebar */}
      <Sidebar />
      {/* Main content */}
      <main className="flex-1 flex flex-col p-6">
        <h1 className="text-3xl font-serif text-stone-100 mb-6 drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)]">Dashboard</h1>
        
        {/* Month Filter */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-10 pr-8 py-2 bg-stone-800/50 border border-stone-600/50 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all appearance-none cursor-pointer"
            >
              {availableMonths.map(month => {
                const [year, m] = month.split('-');
                const monthName = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
                return (
                  <option key={month} value={month}>{monthName}</option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Category Summary Panels */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
          {summaryLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div 
                key={i}
                className="p-4 rounded-xl bg-stone-800/40 border border-stone-600/30 backdrop-blur-xl animate-pulse"
              >
                <div className="h-4 bg-stone-700/50 rounded w-24 mb-2"></div>
                <div className="h-6 bg-stone-700/50 rounded w-32"></div>
              </div>
            ))
          ) : (
            categorySummary.map((cat) => (
              <div 
                key={cat.id}
                className="p-4 rounded-xl bg-stone-800/40 border border-stone-600/30 backdrop-blur-xl"
              >
                <div className="text-xs text-stone-400 uppercase tracking-wider mb-1">{cat.name}</div>
                <div className={`text-lg font-semibold ${cat.total > 0 ? 'text-cyan-400' : 'text-stone-500'}`}>
                  {formatAmount(cat.total)}
                </div>
              </div>
            ))
          )}
        </div>

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
