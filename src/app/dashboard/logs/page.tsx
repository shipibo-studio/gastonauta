"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar";
import { useToast } from "../../components/Toast";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Check,
  Brain,
  Loader2
} from "lucide-react";

interface Transaction {
  id: string;
  email_date: string | null;
  from_name: string | null;
  from_email: string | null;
  message_id: string | null;
  subject: string | null;
  body_raw: string | null;
  body_plain: string | null;
  customer_name: string | null;
  amount: number | null;
  account_last4: string | null;
  merchant: string | null;
  transaction_date: string | null;
  sender_bank: string | null;
  email_type: string | null;
  is_expense: boolean;
  category_id: string | null;
  is_categorized: boolean | null;
  categorized_at: string | null;
  categorization_model: string | null;
  categorization_confidence: number | null;
  created_at: string;
}

type SortField = "transaction_date" | "amount" | "merchant" | "created_at" | "email_date";
type SortOrder = "asc" | "desc";

const CATEGORIES = [
  'Supermercado',
  'Combustible',
  'Restaurante',
  'Transporte',
  'Servicios',
  'Entretenimiento',
  'Otros',
];

export default function LogsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("transaction_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  // Edit modal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Re-categorize with AI
  const [recategorizingId, setRecategorizingId] = useState<string | null>(null);
  const { showToast } = useToast();

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
    if (page !== 1) {
      setPage(1);
    }
    fetchTransactions();
  }, [searchTerm]);

  async function fetchTransactions() {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from("transactions")
        .select("*", { count: "exact" });
      
      if (searchTerm) {
        query = query.or(`merchant.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,body_plain.ilike.%${searchTerm}%`);
      }
      
      query = query.order(sortField, { ascending: sortOrder === "asc" });
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      const { data, count, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setTransactions(data || []);
      setTotalCount(count || 0);
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

  function formatEmailType(emailType: string | null): string {
    if (!emailType) return '-';
    
    // Normalizar tipos de email a texto más legible
    const typeMap: Record<string, string> = {
      'cargo_en_cuenta': 'Cargo en Cuenta',
      'transferencia': 'Transferencia',
      'transferencia_fondos': 'Transferencia',
      'transferencia_recibida': 'Transferencia Recibida',
      'pago_servicio': 'Pago de Servicio',
      'abono': 'Abono',
    };
    
    return typeMap[emailType] || emailType;
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
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function startEdit(tx: Transaction) {
    setEditingId(tx.id);
    setEditForm({
      merchant: tx.merchant,
      amount: tx.amount,
      category_id: tx.category_id,
      transaction_date: tx.transaction_date,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit() {
    if (!editingId) return;
    
    setSaving(true);
    try {
      // Verificar autenticación
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('No estás autenticado. Por favor, inicia sesión.');
        router.push('/login');
        return;
      }
      
      console.log('User authenticated:', session.user.id);
      console.log('Updating transaction:', editingId, editForm);
      
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          merchant: editForm.merchant,
          amount: editForm.amount,
          category_id: editForm.category_id,
          transaction_date: editForm.transaction_date,
        })
        .eq("id", editingId);
      
      console.log('Update result:', { error: updateError });
      
      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw updateError;
      }
      
      // Refresh data
      await fetchTransactions();
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      console.error('Error saving:', err);
      alert(err instanceof Error ? err.message : 'Error guardando');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingId) return;
    
    setDeleting(true);
    try {
      // Verificar autenticación
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('No estás autenticado. Por favor, inicia sesión.');
        router.push('/login');
        return;
      }
      
      console.log('User authenticated:', session.user.id);
      console.log('Deleting transaction:', deletingId);
      
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", deletingId);
      
      console.log('Delete result:', { error: deleteError });
      
      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        throw deleteError;
      }
      
      // Refresh data
      await fetchTransactions();
      setDeletingId(null);
    } catch (err) {
      console.error('Error deleting:', err);
      alert(err instanceof Error ? err.message : 'Error eliminando');
    } finally {
      setDeleting(false);
    }
  }

  async function recategorizeWithAI(txId: string) {
    setRecategorizingId(txId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('No estás autenticado. Por favor, inicia sesión.');
        router.push('/login');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/categorize-transaction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({ transaction_id: txId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al categorizar');
      }

      // Check if any transaction failed
      const failedResults = result.results?.filter((r: { success: boolean }) => !r.success) || [];
      if (failedResults.length > 0) {
        let errorMsg = failedResults[0]?.error || 'Error al categorizar con IA';
        // Extract message from OpenRouter error response if it's a JSON string
        try {
          const parsedError = JSON.parse(errorMsg.replace('OpenRouter API error: ', ''));
          errorMsg = parsedError.error?.message || parsedError.message || errorMsg;
        } catch {
          // Not JSON, use as is
        }
        showToast(errorMsg, 'error');
      } else {
        showToast('Transacción categorizada exitosamente', 'success');
      }

      // Refresh data
      await fetchTransactions();
    } catch (err) {
      console.error('Error re-categorizing:', err);
      showToast(err instanceof Error ? err.message : 'Error al categorizar con IA', 'error');
    } finally {
      setRecategorizingId(null);
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
        <h1 className="text-3xl font-serif text-stone-100 drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)]">
          Logs de Transacciones
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar en todos los campos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-800/50 border border-stone-600/50 rounded-lg text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
            />
          </div>
          
          <button
            onClick={fetchTransactions}
            className="p-2 bg-stone-800/50 border border-stone-600/50 rounded-lg text-stone-100 hover:bg-stone-700/50 hover:border-cyan-400/50 transition-all hover:cursor-pointer"
            title="Actualizar"
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
                  <th 
                    className="px-2 py-2 text-left text-stone-300 font-medium cursor-pointer hover:text-cyan-400"
                    onClick={() => handleSort('transaction_date')}
                  >
                    Fecha {sortField === 'transaction_date' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="px-2 py-2 text-right text-stone-300 font-medium cursor-pointer hover:text-cyan-400"
                    onClick={() => handleSort('amount')}
                  >
                    Monto {sortField === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="px-2 py-2 text-left text-stone-300 font-medium cursor-pointer hover:text-cyan-400"
                    onClick={() => handleSort('merchant')}
                  >
                    Comercio {sortField === 'merchant' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="px-2 py-2 text-left text-stone-300 font-medium">Categoría</th>
                  <th className="px-2 py-2 text-left text-stone-300 font-medium">Banco</th>
                  <th className="px-2 py-2 text-left text-stone-300 font-medium">Tipo</th>
                  <th className="px-2 py-2 text-left text-stone-300 font-medium">Título</th>
                  <th className="px-2 py-2 text-center text-stone-300 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-8 text-center text-stone-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-8 text-center text-red-400">
                      Error: {error}
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-8 text-center text-stone-400">
                      No hay transacciones
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      className="border-b border-stone-700/30 hover:bg-stone-700/20 transition-colors"
                    >
                      <td className="px-2 py-2 text-stone-200 whitespace-nowrap">
                        {formatDate(tx.transaction_date || tx.created_at)}
                      </td>
                      <td className="px-2 py-2 text-right text-cyan-400 font-medium whitespace-nowrap">
                        {formatAmount(tx.amount)}
                      </td>
                      <td className="px-2 py-2 text-stone-200 font-medium max-w-[150px] truncate">
                        {tx.merchant || "-"}
                      </td>
                      <td className="px-2 py-2">
                        {tx.category_id ? (
                          <span className="px-2 py-0.5 rounded-full bg-violet-400/20 text-violet-400 text-xs font-medium">
                            {tx.category_id}
                          </span>
                        ) : tx.is_categorized === false ? (
                          <span className="px-2 py-0.5 rounded-full bg-stone-600/50 text-stone-400 text-xs">
                            Sin categorizar
                          </span>
                        ) : (
                          <span className="text-stone-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-stone-400 max-w-[100px] truncate">
                        {tx.sender_bank || "-"}
                      </td>
                      <td className="px-2 py-2 text-stone-400 max-w-[100px] truncate">
                        {formatEmailType(tx.email_type)}
                      </td>
                      <td className="px-2 py-2 text-stone-200 max-w-[200px] truncate">
                        {tx.subject || "-"}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => recategorizeWithAI(tx.id)}
                            disabled={recategorizingId === tx.id}
                            className="p-1 rounded hover:bg-emerald-400/20 text-emerald-400 transition-colors hover:cursor-pointer disabled:opacity-50"
                            title="Categorizar con IA"
                          >
                            {recategorizingId === tx.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Brain className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => startEdit(tx)}
                            className="p-1 rounded hover:bg-cyan-400/20 text-cyan-400 transition-colors hover:cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDeletingId(tx.id)}
                            className="p-1 rounded hover:bg-red-400/20 text-red-400 transition-colors hover:cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
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

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-stone-800 border border-stone-600 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-xl font-serif text-stone-100 mb-4">Editar Transacción</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-stone-400 text-sm mb-1">Comercio</label>
                <input
                  type="text"
                  value={editForm.merchant || ''}
                  onChange={(e) => setEditForm({...editForm, merchant: e.target.value})}
                  className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
              
              <div>
                <label className="block text-stone-400 text-sm mb-1">Monto</label>
                <input
                  type="number"
                  value={editForm.amount ?? ''}
                  onChange={(e) => setEditForm({...editForm, amount: e.target.value === '' ? null : parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
              
              <div>
                <label className="block text-stone-400 text-sm mb-1">Categoría</label>
                <select
                  value={editForm.category_id || ''}
                  onChange={(e) => setEditForm({...editForm, category_id: e.target.value || null})}
                  className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <option value="">Seleccionar...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-stone-400 text-sm mb-1">Fecha de Transacción</label>
                <input
                  type="datetime-local"
                  value={editForm.transaction_date ? editForm.transaction_date.slice(0, 16) : ''}
                  onChange={(e) => setEditForm({...editForm, transaction_date: e.target.value ? new Date(e.target.value).toISOString() : null})}
                  className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-stone-600 rounded-lg text-stone-300 hover:bg-stone-700/50 transition-all flex items-center justify-center gap-2 hover:cursor-pointer"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-cyan-400/20 border border-cyan-400/50 rounded-lg text-cyan-400 hover:bg-cyan-400/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-stone-800 border border-red-500/50 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h2 className="text-xl font-serif text-stone-100 mb-2">Confirmar Eliminación</h2>
            <p className="text-stone-400 mb-6">
              ¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-stone-600 rounded-lg text-stone-300 hover:bg-stone-700/50 transition-all flex items-center justify-center gap-2 hover:cursor-pointer"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
