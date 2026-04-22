"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar";
import { ConfirmModal } from "../../components/ConfirmModal";
import { useToast } from "../../components/Toast";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import pkg from "../../../../package.json";
import { 
  Settings, 
  Plus, 
  Pencil, 
  Trash2, 
  Tag, 
  X, 
  Check,
  Loader2,
  Brain,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";


// Type for category
interface Category {
  id: string;
  name: string;
  description: string | null;
  keywords: string[] | null;
  is_active: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const appVersion = pkg.version;

  const router = useRouter();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"categories" | "ia" | "reparse">("categories");
  
  // Reparse state
  const [reparseMessageId, setReparseMessageId] = useState("");
  const [reparsing, setReparsing] = useState(false);
  const [reparseResult, setReparseResult] = useState<any>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  
  // LLM Model state
  const [llmModel, setLlmModel] = useState("openrouter/free");
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");
  const [savingLlmModel, setSavingLlmModel] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    keywords: "",
    color: "#22d3ee",
    is_active: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
      }
    });
  }, [router]);

  useEffect(() => {
    fetchCategories();
    fetchLlmModel();
    fetchOpenRouterApiKey();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      showToast("Error al cargar las categorías", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchLlmModel = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "llm_model")
        .single();

      if (error) throw error;
      if (data?.value) {
        setLlmModel(data.value);
      }
    } catch (err) {
      console.error("Error fetching LLM model:", err);
    }
  };

  const fetchOpenRouterApiKey = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "openrouter_api_key")
        .single();

      // If no data or error (no row found), just leave empty
      if (error || !data) {
        return;
      }
      if (data?.value) {
        setOpenRouterApiKey(data.value);
      }
    } catch (err) {
      // Silently ignore errors - just means no API key set yet
    }
  };

  const saveLlmModel = async () => {
    if (!llmModel.trim()) {
      showToast("El modelo no puede estar vacío", "error");
      return;
    }

    try {
      setSavingLlmModel(true);
      const { error } = await supabase
        .from("settings")
        .upsert({ key: "llm_model", value: llmModel.trim() }, { onConflict: "key" });

      if (error) throw error;
      showToast("Modelo de LLM actualizado exitosamente", "success");
    } catch (err) {
      console.error("Error saving LLM model:", err);
      showToast("Error al guardar el modelo de LLM", "error");
    } finally {
      setSavingLlmModel(false);
    }
  };

  const saveOpenRouterApiKey = async () => {
    if (!openRouterApiKey.trim()) {
      showToast("La API Key no puede estar vacía", "error");
      return;
    }

    try {
      setSavingApiKey(true);
      const { error } = await supabase
        .from("settings")
        .upsert({ key: "openrouter_api_key", value: openRouterApiKey.trim() }, { onConflict: "key" });

      if (error) throw error;
      showToast("API Key de OpenRouter guardada exitosamente", "success");
    } catch (err) {
      console.error("Error saving OpenRouter API key:", err);
      showToast("Error al guardar la API Key", "error");
    } finally {
      setSavingApiKey(false);
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || "",
        keywords: category.keywords?.join(", ") || "",
        color: category.color,
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        description: "",
        keywords: "",
        color: "#22d3ee",
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      keywords: "",
      color: "#22d3ee",
      is_active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const keywordsArray = formData.keywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0);

      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        keywords: keywordsArray,
        color: formData.color,
        is_active: formData.is_active,
      };

      if (editingCategory) {
        // Update existing category
        const { error: updateError } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editingCategory.id);

        if (updateError) throw updateError;
      } else {
        // Create new category
        const { error: insertError } = await supabase
          .from("categories")
          .insert(categoryData);

        if (insertError) throw insertError;
      }

      await fetchCategories();
      closeModal();
      showToast(
        editingCategory ? "Categoría actualizada exitosamente" : "Categoría creada exitosamente",
        "success"
      );
    } catch (err) {
      console.error("Error saving category:", err);
      showToast("Error al guardar la categoría", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setSaving(true);
      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryToDelete.id);

      if (deleteError) throw deleteError;
      await fetchCategories();
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
      showToast("Categoría eliminada exitosamente", "success");
    } catch (err) {
      console.error("Error deleting category:", err);
      showToast("Error al eliminar la categoría", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteModalOpen(true);
  };

  const toggleActive = async (category: Category) => {
    try {
      const { error: updateError } = await supabase
        .from("categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id);

      if (updateError) throw updateError;
      await fetchCategories();
      showToast(
        category.is_active ? "Categoría desactivada" : "Categoría activada",
        "success"
      );
    } catch (err) {
      console.error("Error toggling category:", err);
      showToast("Error al cambiar el estado de la categoría", "error");
    }
  };
  const handleReparse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reparseMessageId.trim()) {
      showToast("Por favor ingresa un message_id válido", "error");
      return;
    }

    try {
      setReparsing(true);
      setReparseResult(null);

      // 1. Fetch the transaction from database
      const { data: transaction, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("message_id", reparseMessageId.trim())
        .single();

      if (fetchError || !transaction) {
        showToast("Email no encontrado en la base de datos", "error");
        return;
      }

      if (!transaction.body_plain && !transaction.body_raw) {
        showToast("El email no tiene contenido para parsear", "error");
        return;
      }

      // 2. Call parse-email function
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!anonKey || !supabaseUrl) {
        showToast("Error de configuración: Supabase no está configurado", "error");
        return;
      }

      const parseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
          "apikey": anonKey,
        },
        body: JSON.stringify({
          from_email: transaction.from_email,
          subject: transaction.subject,
          body_plain: transaction.body_plain,
          body_raw: transaction.body_raw,
        }),
      });

      if (!parseResponse.ok) {
        const error = await parseResponse.text();
        showToast(`Error al parsear: ${error}`, "error");
        return;
      }

      const parseResult = await parseResponse.json();

      if (!parseResult.success || !parseResult.parsed) {
        showToast("Error al procesar el email", "error");
        return;
      }

      const parsed = parseResult.parsed;

      // 3. Update the transaction in database
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          customer_name: parsed.customer_name,
          amount: parsed.amount,
          account_last4: parsed.account_last4,
          merchant: parsed.merchant,
          transaction_date: parsed.transaction_date,
          sender_bank: parsed.sender_bank,
          email_type: parsed.email_type,
          is_expense: parsed.is_expense,
        })
        .eq("message_id", reparseMessageId.trim());

      if (updateError) {
        showToast("Error al actualizar la transacción", "error");
        return;
      }

      setReparseResult({
        success: true,
        data: parsed,
      });

      showToast("Email reprocesado y actualizado exitosamente", "success");
      setReparseMessageId("");
    } catch (err) {
      console.error("Error in reparse:", err);
      showToast("Error al reprocesar el email", "error");
    } finally {
      setReparsing(false);
    }
  };
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-stone-100 drop-shadow-[0_2px_16px_rgba(34,211,238,0.7)] flex items-center gap-3">
            <Settings className="w-8 h-8 text-cyan-400" />
            Configuración
            <span className="mt-1 text-[12px] leading-none text-stone-300/70">v{appVersion}</span>
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-stone-700/50 pb-4">
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 rounded-lg font-sans text-sm transition-all hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              activeTab === "categories"
                ? "bg-cyan-400/20 text-cyan-400 border border-cyan-400/30"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-700/30"
            }`}
          >
            <Tag className="w-4 h-4 inline-block mr-2" />
            Categorías
          </button>
          <button
            onClick={() => setActiveTab("ia")}
            className={`px-4 py-2 rounded-lg font-sans text-sm transition-all hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              activeTab === "ia"
                ? "bg-cyan-400/20 text-cyan-400 border border-cyan-400/30"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-700/30"
            }`}
          >
            <Brain className="w-4 h-4 inline-block mr-2" />
            IA
          </button>
          <button
            onClick={() => setActiveTab("reparse")}
            className={`px-4 py-2 rounded-lg font-sans text-sm transition-all hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              activeTab === "reparse"
                ? "bg-cyan-400/20 text-cyan-400 border border-cyan-400/30"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-700/30"
            }`}
          >
            <RefreshCw className="w-4 h-4 inline-block mr-2" />
            Reparse
          </button>
        </div>

        {/* Categories Section */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            {/* Add button */}
            <div className="flex justify-end">
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 border border-cyan-400/30 rounded-lg font-sans text-sm transition-all hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <Plus className="w-4 h-4" />
                Nueva Categoría
              </button>
            </div>

            {/* Categories grid */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`relative p-5 rounded-xl border backdrop-blur-xl transition-all ${
                      category.is_active
                        ? "bg-white/5 border-stone-600/30"
                        : "bg-stone-800/30 border-stone-700/30 opacity-60"
                    }`}
                  >
                    {/* Color indicator */}
                    <div
                      className="absolute top-0 left-0 w-full h-1 rounded-t-xl"
                      style={{ backgroundColor: category.color }}
                    />

                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <h3 className="text-lg font-serif text-stone-100">
                          {category.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openModal(category)}
                          className="p-2 text-stone-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(category)}
                          className="p-2 text-stone-400 hover:text-pink-400 hover:bg-pink-400/10 rounded-lg transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-400"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {category.description && (
                      <p className="text-stone-400 text-sm font-sans mb-3">
                        {category.description}
                      </p>
                    )}

                    {category.keywords && category.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {category.keywords.slice(0, 5).map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-stone-700/50 text-stone-300 text-xs rounded font-sans"
                          >
                            {keyword}
                          </span>
                        ))}
                        {category.keywords.length > 5 && (
                          <span className="px-2 py-0.5 text-stone-500 text-xs font-sans">
                            +{category.keywords.length - 5} más
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-stone-700/30">
                      <span className="text-xs text-stone-500 font-sans">
                        Creada {new Date(category.created_at).toLocaleDateString("es-CL")}
                      </span>
                      <button
                        onClick={() => toggleActive(category)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans transition-all hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                          category.is_active
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-stone-700/50 text-stone-400"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            category.is_active ? "bg-emerald-400" : "bg-stone-500"
                          }`}
                        />
                        {category.is_active ? "Activa" : "Inactiva"}
                      </button>
                    </div>
                  </div>
                ))}

                {categories.length === 0 && (
                  <div className="col-span-full py-12 text-center">
                    <Tag className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                    <p className="text-stone-400 font-sans">
                      No hay categorías aún. Crea una para comenzar.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* IA Section */}
        {activeTab === "ia" && (
          <div className="space-y-6">
            <div className="p-6 bg-white/5 border border-stone-600/30 rounded-xl backdrop-blur-xl">
              <h2 className="text-xl font-serif text-stone-100 mb-2 flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-400" />
                Configuración de IA
              </h2>
              <p className="text-stone-400 text-sm font-sans mb-6">
                Configura el modelo de lenguaje utilizado para categorizar tus transacciones
              </p>

              {/* LLM Model Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-stone-300 text-sm font-sans mb-1.5">
                    Modelo de LLM
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-stone-800/50 border border-stone-600/30 rounded-lg text-stone-100 font-sans placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      placeholder="openrouter/free"
                    />
                    <button
                      onClick={saveLlmModel}
                      disabled={savingLlmModel}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 border border-cyan-400/30 rounded-lg font-sans text-sm transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                    >
                      {savingLlmModel ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Guardar
                    </button>
                  </div>
                  <p className="text-stone-500 text-xs mt-2 font-sans">
                    Ejemplo: openrouter/free, openrouter/anthropic/claude-3-haiku, etc.
                  </p>
                </div>

                {/* OpenRouter API Key Input */}
                <div>
                  <label className="block text-stone-300 text-sm font-sans mb-1.5">
                    API Key de OpenRouter
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={openRouterApiKey}
                        onChange={(e) => setOpenRouterApiKey(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 bg-stone-800/50 border border-stone-600/30 rounded-lg text-stone-100 font-sans placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                        placeholder="sk-..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 transition-colors hover:cursor-pointer"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={saveOpenRouterApiKey}
                      disabled={savingApiKey}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 border border-cyan-400/30 rounded-lg font-sans text-sm transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                    >
                      {savingApiKey ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Guardar
                    </button>
                  </div>
                  <p className="text-stone-500 text-xs mt-2 font-sans">
                    Obtén tu API key en <a href="https://openrouter.ai/settings" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">openrouter.ai/settings</a>
                  </p>
                </div>

                {/* Link to OpenRouter models */}
                <div className="pt-4 border-t border-stone-700/30">
                  <a
                    href="https://openrouter.ai/models"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-sans transition-colors hover:cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver modelos disponibles en OpenRouter
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reparse Section */}
        {activeTab === "reparse" && (
          <div className="space-y-6">
            <div className="p-6 bg-white/5 border border-stone-600/30 rounded-xl backdrop-blur-xl">
              <h2 className="text-xl font-serif text-stone-100 mb-2 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-cyan-400" />
                Reprocesar Email
              </h2>
              <p className="text-stone-400 text-sm font-sans mb-6">
                Ingresa el Message ID de un email para reprocesarlo y actualizar sus datos parseados
              </p>

              <form onSubmit={handleReparse} className="space-y-4">
                <div>
                  <label className="block text-stone-300 text-sm font-sans mb-2">
                    Message ID
                  </label>
                  <input
                    type="text"
                    value={reparseMessageId}
                    onChange={(e) => setReparseMessageId(e.target.value)}
                    placeholder="Ej: 550e8400-e29b-41d4-a716-446655440000"
                    className="w-full px-4 py-2.5 bg-stone-800/50 border border-stone-600/30 rounded-lg text-stone-100 font-sans placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                  />
                  <p className="text-stone-500 text-xs mt-2">
                    Encontrarás el message_id en la sección de Logs o detalles de transacción
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={reparsing}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 border border-cyan-400/30 rounded-lg font-sans text-sm transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                >
                  {reparsing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Reprocesar Email
                </button>
              </form>

              {/* Result */}
              {reparseResult && reparseResult.success && (
                <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <h3 className="text-emerald-400 font-sans font-semibold mb-3">✅ Datos parseados correctamente</h3>
                  <div className="space-y-2 text-sm font-sans text-stone-300">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Tipo:</span>
                      <span className="text-emerald-300">{reparseResult.data.email_type || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Cliente:</span>
                      <span className="text-emerald-300">{reparseResult.data.customer_name || "No detectado"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Comercio/Remitente:</span>
                      <span className="text-emerald-300">{reparseResult.data.merchant || "No detectado"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Monto:</span>
                      <span className="text-emerald-300">${reparseResult.data.amount?.toLocaleString('es-CL') || "No detectado"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Cuenta:</span>
                      <span className="text-emerald-300">{reparseResult.data.account_last4 || "No detectada"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Banco:</span>
                      <span className="text-emerald-300">{reparseResult.data.sender_bank || "No detectado"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Es gasto:</span>
                      <span className="text-emerald-300">{reparseResult.data.is_expense ? "Sí (salida de dinero)" : "No (entrada de dinero)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Fecha:</span>
                      <span className="text-emerald-300">{reparseResult.data.transaction_date ? new Date(reparseResult.data.transaction_date).toLocaleString('es-CL') : "No detectada"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeModal}
            />

            {/* Modal content */}
            <div className="relative w-full max-w-md bg-stone-900/90 border border-stone-700/50 rounded-2xl shadow-2xl backdrop-blur-xl p-6">
              {/* Close button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-700/50 rounded-lg transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <h2 className="text-xl font-serif text-stone-100 mb-6 flex items-center gap-2">
                {editingCategory ? (
                  <>
                    <Pencil className="w-5 h-5 text-cyan-400" />
                    Editar Categoría
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-cyan-400" />
                    Nueva Categoría
                  </>
                )}
              </h2>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-stone-300 text-sm font-sans mb-1.5">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2.5 bg-stone-800/50 border border-stone-600/30 rounded-lg text-stone-100 font-sans placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    placeholder="Ej: Supermercado"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-stone-300 text-sm font-sans mb-1.5">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={2}
                    className="w-full px-4 py-2.5 bg-stone-800/50 border border-stone-600/30 rounded-lg text-stone-100 font-sans placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all resize-none"
                    placeholder="Ej: Compras en supermercados"
                  />
                </div>

                {/* Keywords */}
                <div>
                  <label className="block text-stone-300 text-sm font-sans mb-1.5">
                    Palabras clave
                  </label>
                  <input
                    type="text"
                    value={formData.keywords}
                    onChange={(e) =>
                      setFormData({ ...formData, keywords: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-stone-800/50 border border-stone-600/30 rounded-lg text-stone-100 font-sans placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    placeholder="walmart, jumbo, líder (separadas por coma)"
                  />
                  <p className="text-stone-500 text-xs mt-1 font-sans">
                    Separa las palabras clave con comas
                  </p>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-stone-300 text-sm font-sans mb-1.5">
                    Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="w-12 h-10 rounded-lg border border-stone-600/30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="flex-1 px-4 py-2.5 bg-stone-800/50 border border-stone-600/30 rounded-lg text-stone-100 font-sans placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                      placeholder="#22d3ee"
                    />
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-stone-300 text-sm font-sans">
                    Categoría activa
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, is_active: !formData.is_active })
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      formData.is_active ? "bg-cyan-400" : "bg-stone-600"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        formData.is_active ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 bg-stone-700/50 hover:bg-stone-700 text-stone-300 rounded-lg font-sans text-sm transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 border border-cyan-400/30 rounded-lg font-sans text-sm transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {editingCategory ? "Guardar cambios" : "Crear categoría"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModalOpen}
          title="Eliminar Categoría"
          message={`¿Estás seguro de que deseas eliminar la categoría "${categoryToDelete?.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteModalOpen(false);
            setCategoryToDelete(null);
          }}
          loading={saving}
          variant="danger"
        />
      </main>
    </div>
  );
}
