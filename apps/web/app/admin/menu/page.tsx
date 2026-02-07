"use client";

/**
 * Admin Menu Management Page - Premium Version
 * Create, edit, and delete categories and products
 * Includes AI optimization, drag & drop, and real-time preview
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
    Eye,
    EyeOff,
    DollarSign,
    Tag,
    Utensils,
    Flame,
    Coffee,
    Wine,
    Cake,
    Save,
    RefreshCw,
    ExternalLink,
    LayoutGrid,
    List,
    Search,
    Settings,
    Upload,
    Link as LinkIcon,
    Clock,
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
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

interface MenuCategory {
    id: string;
    $id?: string;
    name: string;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
    printer_target?: string;
}

interface MenuItem {
    id: string;
    $id?: string;
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
    prep_time_minutes: string;
}

type ModalType = "category" | "item" | "ai" | null;

// Category icons mapping
const categoryIcons: Record<string, React.ReactNode> = {
    kitchen: <Utensils className="w-4 h-4" />,
    bar: <Wine className="w-4 h-4" />,
    dessert: <Cake className="w-4 h-4" />,
    coffee: <Coffee className="w-4 h-4" />,
};

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
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");

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
                const data: CategoryUpdateData = {
                    name: editingCategory.name,
                    description: editingCategory.description || undefined,
                    printer_target: editingCategory.printer_target,
                };
                await menuApi.updateCategory(editingCategory.id, data);
            } else {
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
        if (!confirm("¿Estás seguro de eliminar esta categoría? Los productos no se eliminarán.")) return;

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
                prep_time_minutes: ((item as any).prep_time_minutes || 15).toString(),
            });
        } else {
            setEditingItem({
                category_id: selectedCategoryId || "",
                name: "",
                description: "",
                price: "",
                image_url: "",
                route_to: "kitchen",
                prep_time_minutes: "15",
            });
        }
        setModalType("item");
    };

    const saveItem = async () => {
        if (!editingItem?.name.trim() || !editingItem?.price) return;

        setIsSaving(true);
        try {
            if (editingItem.id) {
                const data: ItemUpdateData = {
                    name: editingItem.name,
                    description: editingItem.description || undefined,
                    price: parseFloat(editingItem.price),
                    image_url: editingItem.image_url || undefined,
                    route_to: editingItem.route_to,
                    category_id: editingItem.category_id,
                    prep_time_minutes: parseInt(editingItem.prep_time_minutes) || 15,
                };
                await menuApi.updateItem(editingItem.id, data);
            } else {
                const data: ItemCreateData = {
                    category_id: editingItem.category_id,
                    name: editingItem.name,
                    description: editingItem.description || undefined,
                    price: parseFloat(editingItem.price),
                    image_url: editingItem.image_url || undefined,
                    route_to: editingItem.route_to,
                    prep_time_minutes: parseInt(editingItem.prep_time_minutes) || 15,
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
                suggested_description: "Error al generar descripción. Verifica tu conexión.",
                market_price_analysis: "No se pudo realizar el análisis de precios.",
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
        ? items.filter((item) => {
            const matchesCategory = item.category_id === selectedCategoryId;
            const matchesSearch = searchQuery
                ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
                : true;
            return matchesCategory && matchesSearch;
        })
        : items.filter((item) =>
            searchQuery ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
        );

    const formatPrice = (price: number) =>
        new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(price);

    const totalProducts = items.length;
    const totalCategories = categories.length;

    // ============================================
    // Render
    // ============================================

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
                        <ChefHat className="w-10 h-10 text-white" />
                    </div>
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Cargando menú...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-white flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                                        <ChefHat className="w-5 h-5 text-white" />
                                    </div>
                                    Administrar Menú
                                </h1>
                                <p className="text-sm text-slate-400 mt-0.5">
                                    {totalCategories} categorías • {totalProducts} productos
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Preview Button */}
                            <Link
                                href="/menu"
                                target="_blank"
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                            >
                                <Eye className="w-4 h-4" />
                                <span className="hidden sm:inline">Ver Menú</span>
                                <ExternalLink className="w-3 h-3" />
                            </Link>

                            {/* New Category Button */}
                            <button
                                onClick={() => openCategoryModal()}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Categoría</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 grid lg:grid-cols-[280px_1fr] gap-6">
                {/* Categories Sidebar */}
                <aside className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 h-fit lg:sticky lg:top-24">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-emerald-500" />
                            Categorías
                        </h2>
                        <button
                            onClick={() => openCategoryModal()}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 rounded-lg transition-all"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {categories.length === 0 ? (
                        <div className="text-center py-8">
                            <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">No hay categorías</p>
                            <button
                                onClick={() => openCategoryModal()}
                                className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
                            >
                                Crear primera categoría
                            </button>
                        </div>
                    ) : (
                        <nav className="space-y-1">
                            {/* All Products option */}
                            <button
                                onClick={() => setSelectedCategoryId(null)}
                                className={`
                                    w-full flex items-center justify-between p-3 rounded-xl transition-all
                                    ${!selectedCategoryId
                                        ? "bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-400 border border-emerald-500/30"
                                        : "hover:bg-slate-700/50 text-slate-300"
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <LayoutGrid className="w-4 h-4" />
                                    <span className="font-medium">Todos</span>
                                </div>
                                <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">
                                    {items.length}
                                </span>
                            </button>

                            {categories.map((cat) => {
                                const catId = cat.$id || cat.id;
                                const isSelected = selectedCategoryId === catId;
                                const itemCount = items.filter((i) => i.category_id === catId).length;
                                const icon = categoryIcons[cat.printer_target || "kitchen"] || <Utensils className="w-4 h-4" />;

                                return (
                                    <div
                                        key={catId}
                                        className={`
                                            group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all
                                            ${isSelected
                                                ? "bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-400 border border-emerald-500/30"
                                                : "hover:bg-slate-700/50 text-slate-300"
                                            }
                                        `}
                                        onClick={() => setSelectedCategoryId(catId)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <GripVertical className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 cursor-grab" />
                                            {icon}
                                            <div>
                                                <p className="font-medium text-sm">{cat.name}</p>
                                                <p className="text-xs text-slate-500">{itemCount} productos</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openCategoryModal(cat);
                                                }}
                                                className="p-1.5 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteCategory(catId);
                                                }}
                                                className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </nav>
                    )}
                </aside>

                {/* Products Grid */}
                <main className="space-y-4">
                    {/* Toolbar */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-emerald-500" />
                                <h2 className="font-semibold text-white">
                                    Productos
                                    {selectedCategoryId && (
                                        <span className="text-slate-400 font-normal ml-2">
                                            en {categories.find((c) => (c.$id || c.id) === selectedCategoryId)?.name}
                                        </span>
                                    )}
                                </h2>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-40 sm:w-48"
                                    />
                                </div>

                                {/* View Toggle */}
                                <div className="flex items-center bg-slate-700/50 rounded-xl p-1">
                                    <button
                                        onClick={() => setViewMode("grid")}
                                        className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                                            }`}
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode("list")}
                                        className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                                            }`}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* New Product Button */}
                                <button
                                    onClick={() => openItemModal()}
                                    disabled={categories.length === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    Producto
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Products Content */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 min-h-[400px]">
                        {filteredItems.length === 0 ? (
                            <EmptyState
                                icon={Package}
                                title={searchQuery ? "Sin resultados" : "No hay productos"}
                                description={
                                    searchQuery
                                        ? `No se encontraron productos para "${searchQuery}"`
                                        : categories.length === 0
                                            ? "Primero crea una categoría para agregar productos"
                                            : "Agrega el primer producto a esta categoría"
                                }
                                action={
                                    !searchQuery && categories.length > 0 && (
                                        <button
                                            onClick={() => openItemModal()}
                                            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-xl"
                                        >
                                            Agregar Producto
                                        </button>
                                    )
                                }
                            />
                        ) : viewMode === "grid" ? (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                                                className="group bg-slate-700/30 rounded-2xl p-4 border border-slate-600/50 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/5"
                                            >
                                                {/* Image */}
                                                <div className="aspect-square bg-slate-700/50 rounded-xl mb-3 flex items-center justify-center overflow-hidden relative group-hover:ring-2 ring-emerald-500/30 transition-all">
                                                    {item.image_url ? (
                                                        <img
                                                            src={item.image_url}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center text-slate-500">
                                                            <ImagePlus className="w-8 h-8 mb-1" />
                                                            <span className="text-xs">Sin imagen</span>
                                                        </div>
                                                    )}

                                                    {/* AI Badge */}
                                                    <button
                                                        onClick={() => optimizeWithAI(itemId)}
                                                        className="absolute top-2 right-2 p-2 bg-purple-600/90 hover:bg-purple-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                                        title="Optimizar con IA"
                                                    >
                                                        <Sparkles className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Info */}
                                                <h3 className="font-semibold text-white truncate mb-1">
                                                    {item.name}
                                                </h3>
                                                <p className="text-sm text-slate-400 line-clamp-2 h-10 mb-2">
                                                    {item.description || "Sin descripción"}
                                                </p>
                                                <p className="text-lg font-bold text-emerald-400">
                                                    {formatPrice(item.price)}
                                                </p>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-600/50">
                                                    <button
                                                        onClick={() => openItemModal(item)}
                                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-600/50 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-all"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => deleteItem(itemId)}
                                                        className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredItems.map((item) => {
                                    const itemId = item.$id || item.id;
                                    return (
                                        <div
                                            key={itemId}
                                            className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-xl border border-slate-600/50 hover:border-emerald-500/30 transition-all group"
                                        >
                                            {/* Image */}
                                            <div className="w-16 h-16 bg-slate-700/50 rounded-xl flex-shrink-0 overflow-hidden">
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                        <ImagePlus className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-white truncate">{item.name}</h3>
                                                <p className="text-sm text-slate-400 truncate">
                                                    {item.description || "Sin descripción"}
                                                </p>
                                            </div>

                                            {/* Price */}
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-emerald-400">
                                                    {formatPrice(item.price)}
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => optimizeWithAI(itemId)}
                                                    className="p-2 hover:bg-purple-500/20 text-slate-400 hover:text-purple-400 rounded-lg"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openItemModal(item)}
                                                    className="p-2 hover:bg-slate-600 text-slate-400 hover:text-white rounded-lg"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteItem(itemId)}
                                                    className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {modalType && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
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
                            className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Category Modal */}
                            {modalType === "category" && editingCategory && (
                                <>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                                            <FolderOpen className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">
                                            {editingCategory.id ? "Editar Categoría" : "Nueva Categoría"}
                                        </h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Nombre</label>
                                            <input
                                                type="text"
                                                value={editingCategory.name}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                placeholder="Ej: Entradas, Bebidas, Postres"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
                                            <textarea
                                                value={editingCategory.description}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                rows={2}
                                                placeholder="Descripción opcional"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Destino de Impresión</label>
                                            <select
                                                value={editingCategory.printer_target}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, printer_target: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                            >
                                                <option value="kitchen">🍳 Cocina</option>
                                                <option value="bar">🍸 Bar</option>
                                                <option value="dessert">🍰 Postres</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => { setModalType(null); setEditingCategory(null); }}
                                            className="flex-1 px-4 py-3 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-700 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={saveCategory}
                                            disabled={isSaving || !editingCategory.name.trim()}
                                            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Guardar
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Item Modal */}
                            {modalType === "item" && editingItem && (
                                <>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                                            <Package className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">
                                            {editingItem.id ? "Editar Producto" : "Nuevo Producto"}
                                        </h3>
                                    </div>
                                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Categoría</label>
                                            <select
                                                value={editingItem.category_id}
                                                onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                            >
                                                {categories.map((cat) => (
                                                    <option key={cat.$id || cat.id} value={cat.$id || cat.id}>
                                                        {cat.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Nombre del Producto</label>
                                            <input
                                                type="text"
                                                value={editingItem.name}
                                                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                placeholder="Ej: Tacos al Pastor"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
                                            <textarea
                                                value={editingItem.description}
                                                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                rows={3}
                                                placeholder="Descripción atractiva del platillo"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-2">Precio (MXN)</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                    <input
                                                        type="number"
                                                        value={editingItem.price}
                                                        onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                        placeholder="0.00"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-2">Destino</label>
                                                <select
                                                    value={editingItem.route_to}
                                                    onChange={(e) => setEditingItem({ ...editingItem, route_to: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                >
                                                    <option value="kitchen">Cocina</option>
                                                    <option value="bar">Bar</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                <span className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    Tiempo de Preparación (minutos)
                                                </span>
                                            </label>
                                            <input
                                                type="number"
                                                value={editingItem.prep_time_minutes}
                                                onChange={(e) => setEditingItem({ ...editingItem, prep_time_minutes: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                placeholder="15"
                                                min="1"
                                                max="120"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Tiempo estimado en minutos. Se mostrará en la pantalla de cocina.</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                <span className="flex items-center gap-2">
                                                    <LinkIcon className="w-4 h-4" />
                                                    URL de Imagen
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                value={editingItem.image_url}
                                                onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                placeholder="https://example.com/imagen.jpg"
                                            />
                                            {editingItem.image_url && (
                                                <div className="mt-2 aspect-video rounded-xl overflow-hidden bg-slate-700/50">
                                                    <img
                                                        src={editingItem.image_url}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => { setModalType(null); setEditingItem(null); }}
                                            className="flex-1 px-4 py-3 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-700 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={saveItem}
                                            disabled={isSaving || !editingItem.name.trim() || !editingItem.price}
                                            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Guardar
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* AI Modal */}
                            {modalType === "ai" && (
                                <>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center animate-pulse">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">
                                            Optimización con IA
                                        </h3>
                                    </div>

                                    {isOptimizing ? (
                                        <div className="py-12 text-center">
                                            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                                            </div>
                                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-3" />
                                            <p className="text-slate-400">Analizando tu platillo...</p>
                                            <p className="text-xs text-slate-500 mt-1">Generando descripción de neuromarketing</p>
                                        </div>
                                    ) : aiResult ? (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4" />
                                                    Descripción Sugerida
                                                </label>
                                                <p className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-sm text-slate-300 leading-relaxed">
                                                    {aiResult.suggested_description}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4" />
                                                    Análisis de Precio
                                                </label>
                                                <p className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-slate-300 leading-relaxed">
                                                    {aiResult.market_price_analysis}
                                                </p>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => { setModalType(null); setAiResult(null); setAiItemId(null); }}
                                            className="flex-1 px-4 py-3 border border-slate-600 text-slate-300 rounded-xl hover:bg-slate-700 transition-all"
                                        >
                                            Cerrar
                                        </button>
                                        {aiResult && (
                                            <button
                                                onClick={applyAIDescription}
                                                disabled={isSaving}
                                                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
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
