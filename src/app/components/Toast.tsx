"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-emerald-500/20",
          border: "border-emerald-500/30",
          icon: "text-emerald-400",
          iconComponent: <CheckCircle className="w-5 h-5" />,
        };
      case "error":
        return {
          bg: "bg-red-500/20",
          border: "border-red-500/30",
          icon: "text-red-400",
          iconComponent: <XCircle className="w-5 h-5" />,
        };
      case "warning":
        return {
          bg: "bg-amber-500/20",
          border: "border-amber-500/30",
          icon: "text-amber-400",
          iconComponent: <AlertCircle className="w-5 h-5" />,
        };
      case "info":
      default:
        return {
          bg: "bg-cyan-500/20",
          border: "border-cyan-500/30",
          icon: "text-cyan-400",
          iconComponent: <Info className="w-5 h-5" />,
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);
          return (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${styles.bg} ${styles.border} backdrop-blur-xl shadow-lg min-w-[300px] max-w-[400px] animate-slide-in`}
            >
              <span className={styles.icon}>{styles.iconComponent}</span>
              <p className="flex-1 text-stone-100 font-sans text-sm">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-stone-400 hover:text-stone-200 transition-colors hover:cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
