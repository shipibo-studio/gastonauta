"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  Filter,
  RefreshCw
} from "lucide-react";

interface Transaction {
  id: string;
  email_date: string | null;
  from_name: string | null;
  from_email: string | null;
  message_id: string | null;
  subject: string | null;
  customer_name: string | null;
  amount: number | null;
  account_last4: string | null;
  merchant: string | null;
  transaction_date: string | null;
  sender_bank: string | null;
  created_at: string;
}

type SortField = "transaction_date" | "amount" | "merchant" | "created_at";
type SortOrder = "asc" | "desc";

export default function GastosPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [merchantFilter, setMerchantFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("transaction_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  // Unique merchants for filter dropdown
  const [merchants, setMerchants] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
      }
    });
  }, [router]);

  useEffect(() => {
    fetchTransactions();
  }, [page, sortField, sortOrder]);

  useEffect(() => {
    // Reset page when filters change
    if (page !== 1) {
      setPage(1);
    }
    fetchTransactions();
  }, [searchTerm, merchantFilter]);

  async function fetchTransactions() {
    setLoading(true);
    setError(null);
    
    try {
      // Build query
      let query = supabase
        .from("transactions")
        .select("*", { count: "exact" });
      
      // Apply search filter
      if (searchTerm) {
        query = query.or(`merchant.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%`);
      }
      
      // Apply merchant filter
      if (merchantFilter) {
        query = query.eq("merchant", merchantFilter);
      }
      
      // Apply sorting
      query = query.order(sortField, { ascending: sortOrder === "asc" });
      
      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      const { data, count, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setTransactions(data || []);
      setTotalCount(count || 0);
      
      // Fetch unique merchants for filter dropdown
      if (merchants.length === 0) {
        const { data: merchantData } = await supabase
          .from("transactions")
          .select("merchant")
          .not("merchant", "is", null);
        
        if (merchantData) {
          const uniqueMerchants = [...new Set(merchantData.map(m => m.merchant))];
          setMerchants(uniqueMerchants);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  function formatAmount(amount: number | null): string {
    if (amount === null) return "-";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
        <h1 className="text-3xl font-serif text-stone-100 drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)]">
          Mis gastos
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por comercio, cliente o asunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-800/50 border border-stone-600/50 rounded-lg text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <select
              value={merchantFilter}
              onChange={(e) => setMerchantFilter(e.target.value)}
              className="pl-10 pr-8 py-2 bg-stone-800/50 border border-stone-600/50 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all appearance-none cursor-pointer"
            >
              <option value="">Todos los comercios</option>
              {merchants.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={fetchTransactions}
            className="p-2 bg-stone-800/50 border border-stone-600/50 rounded-lg text-stone-100 hover:bg-stone-700/50 hover:border-cyan-400/50 transition-all"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-stone-600/30 bg-stone-800/30 backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead className="bg-stone-800/50 sticky top-0">
              <tr className="border-b border-stone-600/30">
                <th 
                  className="px-4 py-3 text-left text-stone-300 font-medium cursor-pointer hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort("transaction_date")}
                >
                  <div className="flex items-center gap-2">
                    Fecha
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-stone-300 font-medium cursor-pointer hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort("merchant")}
                >
                  <div className="flex items-center gap-2">
                    Comercio
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-stone-300 font-medium">
                  Cuenta
                </th>
                <th 
                  className="px-4 py-3 text-right text-stone-300 font-medium cursor-pointer hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort("amount")}
                >
                  <div className="flex items-center justify-end gap-2">
                    Monto
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-stone-300 font-medium">
                  Banco
                </th>
                <th className="px-4 py-3 text-left text-stone-300 font-medium">
                  Asunto
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-red-400">
                    Error: {error}
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    No hay transacciones
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr 
                    key={tx.id} 
                    className="border-b border-stone-700/30 hover:bg-stone-700/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-stone-200 whitespace-nowrap">
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td className="px-4 py-3 text-stone-200 font-medium">
                      {tx.merchant || "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-400 font-mono text-xs">
                      ****{tx.account_last4}
                    </td>
                    <td className="px-4 py-3 text-right text-cyan-400 font-medium whitespace-nowrap">
                      {formatAmount(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-stone-400">
                      {tx.sender_bank || tx.from_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-400 truncate max-w-[200px]">
                      {tx.subject || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-stone-400 text-sm">
            Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} de {totalCount} resultados
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-stone-600/50 bg-stone-800/50 text-stone-200 hover:bg-stone-700/50 hover:border-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm transition-all ${
                      page === pageNum 
                        ? "bg-cyan-400/20 text-cyan-400 border border-cyan-400/50" 
                        : "text-stone-300 hover:bg-stone-700/50 border border-transparent"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-stone-600/50 bg-stone-800/50 text-stone-200 hover:bg-stone-700/50 hover:border-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
