"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "../../components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  Plus, 
  Pencil, 
  Trash2, 
  Tag, 
  X, 
  Check,
  Loader2,
  AlertCircle
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
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"categories">("categories");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  
  // Form state
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
      setError("Error al cargar las categorías");
    } finally {
      setLoading(false);
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
    setError(null);

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
    } catch (err) {
      console.error("Error saving category:", err);
      setError("Error al guardar la categoría");
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
    } catch (err) {
      console.error("Error deleting category:", err);
      setError("Error al eliminar la categoría");
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
    } catch (err) {
      console.error("Error toggling category:", err);
      setError("Error al cambiar el estado de la categoría");
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
          </h1>
          <p className="text-stone-400 mt-2 font-sans">
            Administra las categorías utilizadas por la IA para clasificar tus gastos
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-stone-700/50 pb-4">
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 rounded-lg font-sans text-sm transition-all ${
              activeTab === "categories"
                ? "bg-cyan-400/20 text-cyan-400 border border-cyan-400/30"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-700/30"
            }`}
          >
            <Tag className="w-4 h-4 inline-block mr-2" />
            Categorías
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

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
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteModalOpen(false)}
            />

            {/* Modal content */}
            <div className="relative w-full max-w-sm bg-stone-900/90 border border-stone-700/50 rounded-2xl shadow-2xl backdrop-blur-xl p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-pink-400/20 rounded-full">
                  <Trash2 className="w-6 h-6 text-pink-400" />
                </div>
                <h2 className="text-xl font-serif text-stone-100">
                  Eliminar Categoría
                </h2>
              </div>

              {/* Message */}
              <p className="text-stone-300 font-sans mb-6">
                ¿Estás seguro de que deseas eliminar la categoría &quot;{categoryToDelete?.name}&quot;? 
                Esta acción no se puede deshacer.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setCategoryToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-stone-700/50 hover:bg-stone-700 text-stone-300 rounded-lg font-sans text-sm transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-pink-400/20 hover:bg-pink-400/30 text-pink-400 border border-pink-400/30 rounded-lg font-sans text-sm transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
