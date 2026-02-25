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
  const [dailyIncome, setDailyIncome] = useState<{ day: number; amount: number }[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
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
      
      // Fetch expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from("transactions")
        .select("transaction_date, amount")
        .gte("transaction_date", firstDay)
        .lte("transaction_date", lastDay)
        .eq("is_expense", true)
        .not("amount", "is", null);
      
      if (expenseError) throw expenseError;
      
      // Fetch income
      const { data: incomeData, error: incomeError } = await supabase
        .from("transactions")
        .select("transaction_date, amount")
        .gte("transaction_date", firstDay)
        .lte("transaction_date", lastDay)
        .eq("is_expense", false)
        .not("amount", "is", null);
      
      if (incomeError) throw incomeError;
      
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyExpensesMap: { [key: number]: number } = {};
      const dailyIncomeMap: { [key: number]: number } = {};
      let expenseTotal = 0;
      let incomeTotal = 0;
      
      for (let i = 1; i <= daysInMonth; i++) {
        dailyExpensesMap[i] = 0;
        dailyIncomeMap[i] = 0;
      }
      
      expenseData?.forEach(tx => {
        if (tx.transaction_date && tx.amount) {
          const day = new Date(tx.transaction_date).getDate();
          dailyExpensesMap[day] = (dailyExpensesMap[day] || 0) + tx.amount;
          expenseTotal += tx.amount;
        }
      });
      
      incomeData?.forEach(tx => {
        if (tx.transaction_date && tx.amount) {
          const day = new Date(tx.transaction_date).getDate();
          dailyIncomeMap[day] = (dailyIncomeMap[day] || 0) + tx.amount;
          incomeTotal += tx.amount;
        }
      });
      
      const expenseResult = Object.entries(dailyExpensesMap).map(([day, amount]) => ({
        day: parseInt(day),
        amount
      }));
      
      const incomeResult = Object.entries(dailyIncomeMap).map(([day, amount]) => ({
        day: parseInt(day),
        amount
      }));
      
      setDailyExpenses(expenseResult);
      setDailyIncome(incomeResult);
      setTotalExpenses(expenseTotal);
      setTotalIncome(incomeTotal);
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
          {/* Gráfico: Ingresos vs Gastos por día */}
          <section className="rounded-2xl bg-white/10 dark:bg-stone-900/40 backdrop-blur-xl border border-stone-300/20 dark:border-stone-700/40 shadow-xl p-6 flex flex-col min-h-[320px]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <span className="text-stone-200 font-sans">Ingresos vs Gastos por día - {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</span>
            </div>
            
            {chartLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              </div>
            ) : dailyExpenses.length === 0 && dailyIncome.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">
                No hay datos este mes
              </div>
            ) : (
              <>
                <div className="h-44 flex items-end gap-0.5 flex-1">
                  {dailyExpenses.map(({ day, amount: expenseAmount }) => {
                    const incomeItem = dailyIncome.find(d => d.day === day);
                    const incomeAmount = incomeItem?.amount || 0;
                    const maxAmount = Math.max(
                      ...dailyExpenses.map(d => d.amount),
                      ...dailyIncome.map(d => d.amount),
                      1
                    );
                    const expenseHeight = maxAmount > 0 ? (expenseAmount / maxAmount) * 100 : 0;
                    const incomeHeight = maxAmount > 0 ? (incomeAmount / maxAmount) * 100 : 0;
                    const isToday = day === new Date().getDate();
                    
                    return (
                      <div
                        key={day}
                        className="flex-1 flex flex-col items-center group relative"
                      >
                        <div className="relative w-full flex items-end justify-center h-40">
                          {/* Combined tooltip showing both income and expense */}
                          {(incomeAmount > 0 || expenseAmount > 0) && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900 border border-stone-500/50 rounded px-2 py-1 text-[10px] text-stone-200 whitespace-nowrap z-10 flex gap-2">
                              {incomeAmount > 0 && (
                                <span className="text-emerald-400">+${incomeAmount.toLocaleString('es-CL')}</span>
                              )}
                              {incomeAmount > 0 && expenseAmount > 0 && <span className="text-stone-500">|</span>}
                              {expenseAmount > 0 && (
                                <span className="text-cyan-400">-${expenseAmount.toLocaleString('es-CL')}</span>
                              )}
                            </div>
                          )}
                          {/* Income bar (green, goes up) */}
                          <div
                            className={`w-[45%] rounded-t transition-all duration-300 cursor-pointer ${
                              isToday 
                                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' 
                                : incomeAmount > 0 
                                  ? 'bg-emerald-400/70 hover:bg-emerald-400' 
                                  : 'bg-emerald-400/20'
                            }`}
                            style={{ 
                              height: `${Math.max(incomeHeight, 2)}%`,
                              minHeight: incomeAmount > 0 ? '2px' : '0'
                            }}
                          />
                          {/* Expense bar (cyan, goes down from income) */}
                          <div
                            className={`w-[45%] rounded-t transition-all duration-300 cursor-pointer ${
                              isToday 
                                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' 
                                : expenseAmount > 0 
                                  ? 'bg-cyan-400/70 hover:bg-cyan-400/90' 
                                  : 'bg-cyan-400/20'
                            }`}
                            style={{ 
                              height: `${Math.max(expenseHeight, 2)}%`,
                              minHeight: expenseAmount > 0 ? '2px' : '0'
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
                {/* Legend */}
                <div className="mt-3 pt-3 border-t border-stone-600/30 flex justify-center gap-8 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-400"></div>
                    <span className="text-stone-400">Ingresos:</span>
                    <span className="text-emerald-400 font-bold">
                      ${totalIncome.toLocaleString('es-CL')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-cyan-400"></div>
                    <span className="text-stone-400">Gastos:</span>
                    <span className="text-cyan-400 font-bold">
                      ${totalExpenses.toLocaleString('es-CL')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400">Balance:</span>
                    <span className={`font-bold ${totalIncome - totalExpenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${(totalIncome - totalExpenses).toLocaleString('es-CL')}
                    </span>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
