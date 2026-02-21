"use client";

import React from "react";
import { Trash2, Loader2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  loading = false,
  variant = "danger",
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      bg: "bg-pink-400/20",
      text: "text-pink-400",
      border: "border-pink-400/30",
      hoverBg: "hover:bg-pink-400/30",
    },
    warning: {
      bg: "bg-amber-400/20",
      text: "text-amber-400",
      border: "border-amber-400/30",
      hoverBg: "hover:bg-amber-400/30",
    },
    info: {
      bg: "bg-cyan-400/20",
      text: "text-cyan-400",
      border: "border-cyan-400/30",
      hoverBg: "hover:bg-cyan-400/30",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal content */}
      <div className="relative w-full max-w-sm bg-stone-900/90 border border-stone-700/50 rounded-2xl shadow-2xl backdrop-blur-xl p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 ${styles.bg} rounded-full`}>
            <Trash2 className={`w-6 h-6 ${styles.text}`} />
          </div>
          <h2 className="text-xl font-serif text-stone-100">{title}</h2>
        </div>

        {/* Message */}
        <p className="text-stone-300 font-sans mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-stone-700/50 hover:bg-stone-700 text-stone-300 rounded-lg font-sans text-sm transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-500 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 ${styles.bg} ${styles.hoverBg} ${styles.text} border ${styles.border} rounded-lg font-sans text-sm transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-50`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
