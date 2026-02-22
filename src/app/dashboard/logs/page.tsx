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
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Loader2
} from "lucide-react";

interface ActivityLog {
  id: string;
  created_at: string;
  operation_type: string;
  status: 'success' | 'error';
  entity_id: string | null;
  details: Record<string, unknown>;
  error_message: string | null;
  user_id: string | null;
}

type OperationFilter = 'all' | 'webhook_email_success' | 'webhook_email_error' | 
  'parse_email_success' | 'parse_email_error' | 
  'expense_create' | 'expense_update' | 'expense_delete' | 
  'categorize_transaction_success' | 'categorize_transaction_error' |
  'settings_update';

type StatusFilter = 'all' | 'success' | 'error';

const operationLabels: Record<string, string> = {
  'webhook_email_success': 'Webhook Email Guardado',
  'webhook_email_error': 'Error Webhook Email',
  'parse_email_success': 'Email Parseado (Regex)',
  'parse_email_error': 'Error al Parsear Email',
  'expense_create': 'Gasto Creado',
  'expense_update': 'Gasto Editado',
  'expense_delete': 'Gasto Eliminado',
  'categorize_transaction_success': 'Categorización IA',
  'categorize_transaction_error': 'Error Categorización IA',
  'settings_update': 'Configuración Actualizada',
};

const operationColors: Record<string, string> = {
  'webhook_email_success': 'bg-emerald-400/20 text-emerald-400',
  'webhook_email_error': 'bg-red-400/20 text-red-400',
  'parse_email_success': 'bg-cyan-400/20 text-cyan-400',
  'parse_email_error': 'bg-red-400/20 text-red-400',
  'expense_create': 'bg-violet-400/20 text-violet-400',
  'expense_update': 'bg-amber-400/20 text-amber-400',
  'expense_delete': 'bg-red-400/20 text-red-400',
  'categorize_transaction_success': 'bg-blue-400/20 text-blue-400',
  'categorize_transaction_error': 'bg-red-400/20 text-red-400',
  'settings_update': 'bg-stone-400/20 text-stone-400',
};

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [operationFilter, setOperationFilter] = useState<OperationFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<"created_at">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
      }
    });
  }, [router]);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, sortField, sortOrder]);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
    fetchLogs();
  }, [searchTerm, operationFilter, statusFilter]);

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from("activity_logs")
        .select("*", { count: "exact" });
      
      // Apply operation filter
      if (operationFilter !== 'all') {
        query = query.eq('operation_type', operationFilter);
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Apply search filter
      if (searchTerm) {
        query = query.or(`entity_id.ilike.%${searchTerm}%,error_message.ilike.%${searchTerm}%`);
      }
      
      // Apply sorting
      query = query.order(sortField, { ascending: sortOrder === "asc" });
      
      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      const { data, count, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleSort(field: "created_at") {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  function resetFilters() {
    setSearchTerm("");
    setOperationFilter('all');
    setStatusFilter('all');
    setPage(1);
    fetchLogs();
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  function formatDetails(details: Record<string, unknown>): string {
    if (!details || Object.keys(details).length === 0) return '-';
    
    const entries = Object.entries(details);
    const formatted = entries.slice(0, 3).map(([key, value]) => {
      if (key === 'amount' && typeof value === 'number') {
        return `${key}: $${value.toLocaleString('es-CL')}`;
      }
      if (typeof value === 'object') {
        return `${key}: ${JSON.stringify(value).substring(0, 30)}`;
      }
      return `${key}: ${value}`;
    });
    
    return formatted.join(', ') + (entries.length > 3 ? '...' : '');
  }

  function getStatusIcon(status: 'success' | 'error') {
    if (status === 'success') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
    return <XCircle className="w-4 h-4 text-red-400" />;
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
        <h1 className="text-3xl font-serif text-stone-100 drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)]">
          Logs de Actividad
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por entity_id o error..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-800/50 border border-stone-600/50 rounded-lg text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <select
              value={operationFilter}
              onChange={(e) => setOperationFilter(e.target.value as OperationFilter)}
              className="pl-10 pr-8 py-2 bg-stone-800/50 border border-stone-600/50 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all appearance-none cursor-pointer"
            >
              <option value="all">Todas las operaciones</option>
              <option value="webhook_email_success">Webhook Email Guardado</option>
              <option value="webhook_email_error">Error Webhook Email</option>
              <option value="parse_email_success">Email Parseado</option>
              <option value="parse_email_error">Error Parseo</option>
              <option value="expense_create">Gasto Creado</option>
              <option value="expense_update">Gasto Editado</option>
              <option value="expense_delete">Gasto Eliminado</option>
              <option value="categorize_transaction_success">Categorización IA</option>
              <option value="categorize_transaction_error">Error Categorización</option>
              <option value="settings_update">Configuración</option>
            </select>
          </div>
          
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-2 bg-stone-800/50 border border-stone-600/50 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all appearance-none cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="success">Exitosos</option>
              <option value="error">Errores</option>
            </select>
          </div>
          
          <button
            onClick={resetFilters}
            className="p-2 bg-stone-800/50 border border-stone-600/50 rounded-lg text-stone-100 hover:bg-stone-700/50 hover:border-cyan-400/50 transition-all hover:cursor-pointer"
            title="Limpiar filtros"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-stone-600/30 bg-stone-800/30 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-800/50 sticky top-0">
                <tr className="border-b border-stone-600/30">
                  <th className="px-2 py-2 text-center text-stone-300 font-medium w-12">
                    Estado
                  </th>
                  <th 
                    className="px-2 py-2 text-left text-stone-300 font-medium cursor-pointer hover:text-cyan-400"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Fecha/Hora
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-2 py-2 text-left text-stone-300 font-medium">
                    Operación
                  </th>
                  <th className="px-2 py-2 text-left text-stone-300 font-medium">
                    Entity ID
                  </th>
                  <th className="px-2 py-2 text-left text-stone-300 font-medium">
                    Detalles
                  </th>
                  <th className="px-2 py-2 text-left text-stone-300 font-medium">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-8 text-center text-stone-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-8 text-center text-red-400">
                      Error: {error}
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-8 text-center text-stone-400">
                      No hay logs registrados
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="border-b border-stone-700/30 hover:bg-stone-700/20 transition-colors"
                    >
                      <td className="px-2 py-2 text-center">
                        {getStatusIcon(log.status)}
                      </td>
                      <td className="px-2 py-2 text-stone-200 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-2 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${operationColors[log.operation_type] || 'bg-stone-400/20 text-stone-400'}`}>
                          {operationLabels[log.operation_type] || log.operation_type}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-stone-400 max-w-[150px] truncate font-mono text-[10px]">
                        {log.entity_id || '-'}
                      </td>
                      <td className="px-2 py-2 text-stone-400 max-w-[200px] truncate text-[10px]">
                        {formatDetails(log.details)}
                      </td>
                      <td className="px-2 py-2 text-red-400 max-w-[150px] truncate text-[10px]">
                        {log.error_message || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
              className="p-2 rounded-lg border border-stone-600/50 bg-stone-800/50 text-stone-200 hover:bg-stone-700/50 hover:border-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-stone-300 text-sm">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-stone-600/50 bg-stone-800/50 text-stone-200 hover:bg-stone-700/50 hover:border-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
