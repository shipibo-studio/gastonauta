"use client";

import { ReactNode } from "react";
import { 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
  Loader2
} from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  sortableField?: string;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (row: T) => ReactNode;
  titleField?: keyof T; // Field to use for tooltip text
}

export interface DataTableProps<T> {
  // Data
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  
  // Pagination
  page: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  
  // Sorting
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string) => void;
  
  // Loading state for refresh
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  loading = false,
  error = null,
  emptyMessage = "No hay datos",
  page,
  totalCount,
  pageSize,
  onPageChange,
  sortField,
  sortOrder,
  onSort,
  isRefreshing = false,
  onRefresh,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable || !onSort) return null;
    
    const isActive = sortField === (column.sortableField || column.key);
    
    return (
      <ArrowUpDown 
        className={`w-3 h-3 ${isActive ? "text-cyan-400" : ""}`} 
      />
    );
  };

  const handleSort = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.sortableField || column.key);
    }
  };

  return (
    <div className="flex-1 overflow-auto rounded-xl border border-stone-600/30 bg-stone-800/30 backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-800/50 sticky top-0">
            <tr className="border-b border-stone-600/30">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-2 py-2 text-stone-300 font-medium
                    ${column.sortable ? "cursor-pointer hover:text-cyan-400 transition-colors" : ""}
                    ${column.align === "center" ? "text-center" : column.align === "right" ? "text-right" : "text-left"}
                  `}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className={`flex items-center gap-1 ${column.align === "center" ? "justify-center" : column.align === "right" ? "justify-end" : "justify-start"}`}>
                    {column.header}
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-2 py-8 text-center text-stone-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="px-2 py-8 text-center text-red-400">
                  Error: {error}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-2 py-8 text-center text-stone-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr 
                  key={row.id} 
                  className="border-b border-stone-700/30 hover:bg-stone-700/20 transition-colors"
                >
                  {columns.map((column) => {
                    // Get title for tooltip - always show tooltip
                    const titleValue = column.titleField 
                      ? String(row[column.titleField] ?? '')
                      : String((row as Record<string, unknown>)[column.key] ?? "-");
                    
                    // Get display value
                    const displayValue = column.render 
                      ? column.render(row) 
                      : String((row as Record<string, unknown>)[column.key] ?? "-");
                    
                    return (
                    <td
                      key={`${row.id}-${column.key}`}
                      className={`
                        px-2 py-2
                        ${column.align === "center" ? "text-center" : column.align === "right" ? "text-right" : "text-left"}
                        ${column.key === "amount" || column.key === "monto" ? "text-cyan-400 font-medium whitespace-nowrap" : "text-stone-200"}
                      `}
                      style={{ maxWidth: column.width }}
                    >
                      <div 
                        className="truncate"
                        title={titleValue && titleValue !== '-' ? titleValue : undefined}
                      >
                        {displayValue}
                      </div>
                    </td>
                    );})}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-4 border-t border-stone-600/30">
        <div className="text-stone-400 text-sm">
          Mostrando {startItem} - {endItem} de {totalCount} resultados
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg border border-stone-600/50 bg-stone-800/50 text-stone-200 hover:bg-stone-700/50 hover:border-cyan-400/50 disabled:opacity-50 transition-all hover:cursor-pointer mr-2"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-stone-600/50 bg-stone-800/50 text-stone-200 hover:bg-stone-700/50 hover:border-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-stone-300 text-sm">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border border-stone-600/50 bg-stone-800/50 text-stone-200 hover:bg-stone-700/50 hover:border-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
