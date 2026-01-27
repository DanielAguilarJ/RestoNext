"use client";

/**
 * Admin Menu Management Page
 * Create, edit, and delete categories and products
 * Includes AI optimization integration
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    Check,
    X,
    Loader2,
    Sparkles,
    ChefHat,
    FolderOpen,
    Package,
    GripVertical,
    ImagePlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    menuApi,
    CategoryCreateData,
    CategoryUpdateData,
    ItemCreateData,
    ItemUpdateData,
    AIOptimizationResponse,
} from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";

// ============================================
// Types
// ============================================

// Local type definitions matching API responses
interface MenuCategory {
    id: string;
    $id?: string; // Appwrite compat
    name: string;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
    printer_target?: string;
}

interface MenuItem {
    id: string;
    $id?: string; // Appwrite compat
    category_id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    route_to?: string;
    is_available?: boolean;
    sort_order?: number;
}

interface EditingCategory {
    id?: string;
    name: string;
    description: string;
    printer_target: string;
}

interface EditingItem {
    id?: string;
    category_id: string;
    name: string;
    description: string;
    price: string;
    image_url: string;
    route_to: string;
}

type ModalType = "category" | "item" | "ai" | null;

// ============================================
// Component
// ============================================

export default function AdminMenuPage() {
    const router = useRouter();

    // Data state
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [modalType, setModalType] = useState<ModalType>(null);
    const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null);
    const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

    // AI state
    const [aiResult, setAiResult] = useState<AIOptimizationResponse | null>(null);
    const [aiItemId, setAiItemId] = useState<string | null>(null);
    const [isOptimizing, setIsOptimizing] = useState(false);

    // ============================================
    // Data Loading
    // ============================================

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [cats, allItems] = await Promise.all([
                menuApi.getCategories(),
                menuApi.getItems(),
            ]);
            setCategories(cats);
            setItems(allItems);

            // Select first category if none selected
            if (!selectedCategoryId && cats.length > 0) {
                setSelectedCategoryId(cats[0].$id || cats[0].id);
            }
        } catch (error) {
            console.error("Failed to load menu data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedCategoryId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ============================================
    // Category CRUD
    // ============================================

    const openCategoryModal = (category?: MenuCategory) => {
        if (category) {
            setEditingCategory({
                id: category.$id || category.id,
                name: category.name,
                description: category.description || "",
                printer_target: (category as any).printer_target || "kitchen",
            });
        } else {
            setEditingCategory({
                name: "",
                description: "",
                printer_target: "kitchen",
            });
        }
        setModalType("category");
    };

    const saveCategory = async () => {
        if (!editingCategory?.name.trim()) return;

        setIsSaving(true);
        try {
            if (editingCategory.id) {
                // Update
                const data: CategoryUpdateData = {
                    name: editingCategory.name,
                    description: editingCategory.description || undefined,
                    printer_target: editingCategory.printer_target,
                };
                await menuApi.updateCategory(editingCategory.id, data);
            } else {
                // Create
                const data: CategoryCreateData = {
                    name: editingCategory.name,
                    description: editingCategory.description || undefined,
                    printer_target: editingCategory.printer_target,
                };
                await menuApi.createCategory(data);
            }
            await loadData();
            setModalType(null);
            setEditingCategory(null);
        } catch (error) {
            console.error("Failed to save category:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteCategory = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;

        try {
            await menuApi.deleteCategory(id);
            await loadData();
            if (selectedCategoryId === id) {
                setSelectedCategoryId(categories[0]?.$id || categories[0]?.id || null);
            }
        } catch (error) {
            console.error("Failed to delete category:", error);
        }
    };

    // ============================================
    // Item CRUD
    // ============================================

    const openItemModal = (item?: MenuItem) => {
        if (item) {
            setEditingItem({
                id: item.$id || item.id,
                category_id: item.category_id,
                name: item.name,
                description: item.description || "",
                price: item.price.toString(),
                image_url: item.image_url || "",
                route_to: (item as any).route_to || "kitchen",
            });
        } else {
            setEditingItem({
                category_id: selectedCategoryId || "",
                name: "",
                description: "",
                price: "",
                image_url: "",
                route_to: "kitchen",
            });
        }
        setModalType("item");
    };

    const saveItem = async () => {
        if (!editingItem?.name.trim() || !editingItem?.price) return;

        setIsSaving(true);
        try {
            if (editingItem.id) {
                // Update
                const data: ItemUpdateData = {
                    name: editingItem.name,
                    description: editingItem.description || undefined,
                    price: parseFloat(editingItem.price),
                    image_url: editingItem.image_url || undefined,
                    route_to: editingItem.route_to,
                    category_id: editingItem.category_id,
                };
                await menuApi.updateItem(editingItem.id, data);
            } else {
                // Create
                const data: ItemCreateData = {
                    category_id: editingItem.category_id,
                    name: editingItem.name,
                    description: editingItem.description || undefined,
                    price: parseFloat(editingItem.price),
                    image_url: editingItem.image_url || undefined,
                    route_to: editingItem.route_to,
                };
                await menuApi.createItem(data);
            }
            await loadData();
            setModalType(null);
            setEditingItem(null);
        } catch (error) {
            console.error("Failed to save item:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteItem = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este producto?")) return;

        try {
            await menuApi.deleteItem(id);
            await loadData();
        } catch (error) {
            console.error("Failed to delete item:", error);
        }
    };

    // ============================================
    // AI Optimization
    // ============================================

    const optimizeWithAI = async (itemId: string) => {
        setAiItemId(itemId);
        setIsOptimizing(true);
        setModalType("ai");

        try {
            const result = await menuApi.optimizeItem(itemId);
            setAiResult(result);
        } catch (error) {
            console.error("AI optimization failed:", error);
            setAiResult({
                suggested_description: "Error al generar descripción",
                market_price_analysis: "No se pudo realizar el análisis de precios",
            });
        } finally {
            setIsOptimizing(false);
        }
    };

    const applyAIDescription = async () => {
        if (!aiItemId || !aiResult?.suggested_description) return;

        setIsSaving(true);
        try {
            await menuApi.updateItem(aiItemId, {
                description: aiResult.suggested_description,
            });
            await loadData();
            setModalType(null);
            setAiResult(null);
            setAiItemId(null);
        } catch (error) {
            console.error("Failed to apply AI description:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // ============================================
    // Derived Data
    // ============================================

    const filteredItems = selectedCategoryId
        ? items.filter((item) => item.category_id === selectedCategoryId)
        : items;

    const formatPrice = (price: number) =>
        new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(price);

    // ============================================
    // Render
    // ============================================

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Cargando menú...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/dashboard"
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <ChefHat className="w-6 h-6 text-emerald-600" />
                                Administrar Menú
                            </h1>
                            <p className="text-sm text-gray-500">
                                {categories.length} categorías • {items.length} productos
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => openCategoryModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Categoría
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 grid lg:grid-cols-[300px_1fr] gap-6">
                {/* Categories Sidebar */}
                <aside className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 h-fit lg:sticky lg:top-24">
                    <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-emerald-600" />
                        Categorías
                    </h2>

                    {categories.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">
                            No hay categorías. Crea la primera.
                        </p>
                    ) : (
                        <nav className="space-y-1">
                            {categories.map((cat) => {
                                const catId = cat.$id || cat.id;
                                const isSelected = selectedCategoryId === catId;
                                const itemCount = items.filter((i) => i.category_id === catId).length;

                                return (
                                    <div
                                        key={catId}
                                        className={`
                                            group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
                                            ${isSelected
                                                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                            }
                                        `}
                                        onClick={() => setSelectedCategoryId(catId)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                                            <div>
                                                <p className="font-medium">{cat.name}</p>
                                                <p className="text-xs text-gray-500">{itemCount} productos</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openCategoryModal(cat);
                                                }}
                                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteCategory(catId);
                                                }}
                                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </nav>
                    )}
                </aside>

                {/* Products Grid */}
                <main className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-emerald-600" />
                            Productos
                            {selectedCategoryId && (
                                <span className="text-sm font-normal text-gray-500">
                                    en {categories.find((c) => (c.$id || c.id) === selectedCategoryId)?.name}
                                </span>
                            )}
                        </h2>
                        <button
                            onClick={() => openItemModal()}
                            disabled={!selectedCategoryId}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Producto
                        </button>
                    </div>

                    {filteredItems.length === 0 ? (
                        <EmptyState
                            icon={Package}
                            title="No hay productos"
                            description={
                                selectedCategoryId
                                    ? "Agrega el primer producto a esta categoría"
                                    : "Selecciona una categoría para ver sus productos"
                            }
                            action={
                                selectedCategoryId && (
                                    <button
                                        onClick={() => openItemModal()}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                    >
                                        Agregar Producto
                                    </button>
                                )
                            }
                        />
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <AnimatePresence>
                                {filteredItems.map((item) => {
                                    const itemId = item.$id || item.id;
                                    return (
                                        <motion.div
                                            key={itemId}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="group bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
                                        >
                                            {/* Image placeholder */}
                                            <div className="aspect-square bg-gray-200 dark:bg-gray-600 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <ImagePlus className="w-8 h-8 text-gray-400" />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                {item.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10">
                                                {item.description || "Sin descripción"}
                                            </p>
                                            <p className="text-lg font-bold text-emerald-600 mt-2">
                                                {formatPrice(item.price)}
                                            </p>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                <button
                                                    onClick={() => optimizeWithAI(itemId)}
                                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                    AI
                                                </button>
                                                <button
                                                    onClick={() => openItemModal(item)}
                                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteItem(itemId)}
                                                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </main>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {modalType && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        onClick={() => {
                            setModalType(null);
                            setEditingCategory(null);
                            setEditingItem(null);
                            setAiResult(null);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Category Modal */}
                            {modalType === "category" && editingCategory && (
                                <>
                                    <h3 className="text-lg font-bold mb-4">
                                        {editingCategory.id ? "Editar Categoría" : "Nueva Categoría"}
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Nombre</label>
                                            <input
                                                type="text"
                                                value={editingCategory.name}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500"
                                                placeholder="Ej: Entradas"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Descripción</label>
                                            <textarea
                                                value={editingCategory.description}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500"
                                                rows={2}
                                                placeholder="Descripción opcional"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Impresora</label>
                                            <select
                                                value={editingCategory.printer_target}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, printer_target: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500"
                                            >
                                                <option value="kitchen">Cocina</option>
                                                <option value="bar">Bar</option>
                                                <option value="dessert">Postres</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => { setModalType(null); setEditingCategory(null); }}
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={saveCategory}
                                            disabled={isSaving || !editingCategory.name.trim()}
                                            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2"
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            Guardar
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Item Modal */}
                            {modalType === "item" && editingItem && (
                                <>
                                    <h3 className="text-lg font-bold mb-4">
                                        {editingItem.id ? "Editar Producto" : "Nuevo Producto"}
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Nombre</label>
                                            <input
                                                type="text"
                                                value={editingItem.name}
                                                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500"
                                                placeholder="Ej: Tacos al Pastor"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Descripción</label>
                                            <textarea
                                                value={editingItem.description}
                                                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500"
                                                rows={2}
                                                placeholder="Descripción del platillo"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Precio (MXN)</label>
                                                <input
                                                    type="number"
                                                    value={editingItem.price}
                                                    onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Destino</label>
                                                <select
                                                    value={editingItem.route_to}
                                                    onChange={(e) => setEditingItem({ ...editingItem, route_to: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500"
                                                >
                                                    <option value="kitchen">Cocina</option>
                                                    <option value="bar">Bar</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">URL de Imagen</label>
                                            <input
                                                type="text"
                                                value={editingItem.image_url}
                                                onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => { setModalType(null); setEditingItem(null); }}
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={saveItem}
                                            disabled={isSaving || !editingItem.name.trim() || !editingItem.price}
                                            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2"
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            Guardar
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* AI Modal */}
                            {modalType === "ai" && (
                                <>
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-purple-600" />
                                        Optimización con IA
                                    </h3>

                                    {isOptimizing ? (
                                        <div className="py-12 text-center">
                                            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
                                            <p className="text-gray-500">Analizando tu platillo...</p>
                                        </div>
                                    ) : aiResult ? (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-2 text-purple-600">
                                                    Descripción Sugerida
                                                </label>
                                                <p className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm">
                                                    {aiResult.suggested_description}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2 text-emerald-600">
                                                    Análisis de Precio
                                                </label>
                                                <p className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm">
                                                    {aiResult.market_price_analysis}
                                                </p>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => { setModalType(null); setAiResult(null); setAiItemId(null); }}
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            Cerrar
                                        </button>
                                        {aiResult && (
                                            <button
                                                onClick={applyAIDescription}
                                                disabled={isSaving}
                                                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2"
                                            >
                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                Aplicar Descripción
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
