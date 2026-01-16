"use client";

/**
 * Split Check Component - Premium Version
 * 
 * Allows splitting a bill between multiple people using drag-and-drop.
 * Uses @dnd-kit for accessible, mobile-friendly drag and drop.
 */

import { useState, useMemo } from "react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn, formatPrice } from "@/lib/utils";
import { GripVertical, Plus, Minus, CreditCard, Banknote, Check, Sparkles, PartyPopper } from "lucide-react";

// Types
interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

interface Split {
    id: string;
    label: string;
    itemIds: string[];
    paid: boolean;
    paymentMethod?: "cash" | "card" | "transfer";
}

// Draggable Item Component
function DraggableItem({
    id,
    item,
    isDragging,
}: {
    id: string;
    item: OrderItem;
    isDragging?: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 p-4 glass rounded-xl border-2 border-white/30",
                "transition-all duration-300 touch-target",
                isDragging && "opacity-50 scale-105 shadow-xl border-brand-500 rotate-2"
            )}
        >
            <button
                {...attributes}
                {...listeners}
                className="touch-none p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
                <GripVertical className="w-5 h-5 text-gray-400" />
            </button>

            <div className="w-10 h-10 bg-gradient-to-br from-brand-100 to-brand-200 rounded-lg flex items-center justify-center text-lg">
                🍽️
            </div>

            <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                <div className="text-sm text-gray-500">×{item.quantity}</div>
            </div>

            <div className="font-bold text-brand-600 text-lg">
                {formatPrice(item.price * item.quantity)}
            </div>
        </div>
    );
}

// Split Container Component
function SplitContainer({
    split,
    items,
    total,
    onPay,
}: {
    split: Split;
    items: OrderItem[];
    total: number;
    onPay: (splitId: string, method: "cash" | "card") => void;
}) {
    return (
        <div
            className={cn(
                "glass rounded-2xl p-5 min-h-[220px] transition-all duration-300",
                "border-2 border-dashed",
                split.paid
                    ? "border-green-400 bg-green-50/50 dark:bg-green-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-brand-300"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                    {split.label}
                    {split.paid && (
                        <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
                            <Check className="w-4 h-4 text-white" />
                        </span>
                    )}
                </h3>
                <span className={cn(
                    "text-2xl font-bold transition-colors",
                    split.paid ? "text-green-600" : "text-brand-600"
                )}>
                    {formatPrice(total)}
                </span>
            </div>

            {/* Items */}
            <SortableContext
                items={split.itemIds}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-2 min-h-[100px]">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-28 text-gray-400 text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                            <span className="text-2xl mb-2">📦</span>
                            <p>Arrastra productos aquí</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <DraggableItem key={item.id} id={item.id} item={item} />
                        ))
                    )}
                </div>
            </SortableContext>

            {/* Payment Buttons */}
            {!split.paid && total > 0 && (
                <div className="flex gap-3 mt-5">
                    <button
                        onClick={() => onPay(split.id, "cash")}
                        className="flex-1 flex items-center justify-center gap-2 py-4 px-4
                                 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                                 text-white rounded-xl font-bold transition-all duration-300 
                                 shadow-lg shadow-green-500/30 hover:shadow-xl active:scale-[0.98]"
                    >
                        <Banknote className="w-5 h-5" />
                        Efectivo
                    </button>
                    <button
                        onClick={() => onPay(split.id, "card")}
                        className="flex-1 flex items-center justify-center gap-2 py-4 px-4
                                 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                                 text-white rounded-xl font-bold transition-all duration-300 
                                 shadow-lg shadow-blue-500/30 hover:shadow-xl active:scale-[0.98]"
                    >
                        <CreditCard className="w-5 h-5" />
                        Tarjeta
                    </button>
                </div>
            )}

            {/* Paid indicator */}
            {split.paid && (
                <div className="mt-4 flex items-center justify-center gap-2 text-green-600 font-medium animate-slide-up">
                    <Check className="w-5 h-5" />
                    Pagado con {split.paymentMethod === "cash" ? "efectivo" : "tarjeta"}
                </div>
            )}
        </div>
    );
}

// Main Component
interface SplitCheckProps {
    orderId: string;
    orderItems: OrderItem[];
    onComplete?: () => void;
    onPay?: (amount: number, method: "cash" | "card") => Promise<void>;
}

export function SplitCheck({ orderId, orderItems, onComplete, onPay }: SplitCheckProps) {
    const [splits, setSplits] = useState<Split[]>([
        { id: "split-1", label: "Persona 1", itemIds: orderItems.map(i => i.id), paid: false },
        { id: "split-2", label: "Persona 2", itemIds: [], paid: false },
    ]);

    const [activeId, setActiveId] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Calculate totals
    const itemsById = useMemo(() => {
        return new Map(orderItems.map((item) => [item.id, item]));
    }, [orderItems]);

    const getSplitTotal = (split: Split) => {
        return split.itemIds.reduce((sum, itemId) => {
            const item = itemsById.get(itemId);
            return sum + (item ? item.price * item.quantity : 0);
        }, 0);
    };

    const getSplitItems = (split: Split) => {
        return split.itemIds
            .map((id) => itemsById.get(id))
            .filter(Boolean) as OrderItem[];
    };

    // Drag handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeItemId = active.id as string;
        const overId = over.id as string;

        const sourceSplit = splits.find((s) => s.itemIds.includes(activeItemId));

        let destSplit = splits.find((s) => s.id === overId);
        if (!destSplit) {
            destSplit = splits.find((s) => s.itemIds.includes(overId));
        }

        if (!sourceSplit || !destSplit || sourceSplit.id === destSplit.id) return;

        setSplits((prev) =>
            prev.map((split) => {
                if (split.id === sourceSplit.id) {
                    return {
                        ...split,
                        itemIds: split.itemIds.filter((id) => id !== activeItemId),
                    };
                }
                if (split.id === destSplit!.id) {
                    return {
                        ...split,
                        itemIds: [...split.itemIds, activeItemId],
                    };
                }
                return split;
            })
        );
    };

    // Add/Remove split
    const addSplit = () => {
        const newSplit: Split = {
            id: `split-${splits.length + 1}`,
            label: `Persona ${splits.length + 1}`,
            itemIds: [],
            paid: false,
        };
        setSplits([...splits, newSplit]);
    };

    const removeSplit = (splitId: string) => {
        if (splits.length <= 2) return;

        const splitToRemove = splits.find((s) => s.id === splitId);
        if (!splitToRemove) return;

        setSplits((prev) => {
            const remaining = prev.filter((s) => s.id !== splitId);
            remaining[0].itemIds = [
                ...remaining[0].itemIds,
                ...splitToRemove.itemIds,
            ];
            return remaining;
        });
    };

    // Pay split
    const handlePay = async (splitId: string, method: "cash" | "card") => {
        const total = getSplitTotal(splits.find(s => s.id === splitId)!);

        if (onPay) {
            try {
                await onPay(total, method);
            } catch (error) {
                alert("Error al procesar pago");
                return;
            }
        }

        setSplits((prev) =>
            prev.map((split) =>
                split.id === splitId
                    ? { ...split, paid: true, paymentMethod: method }
                    : split
            )
        );

        // Check if all splits are paid
        const allPaid = splits.every((s) => s.id === splitId || s.paid);
        if (allPaid) {
            setShowCelebration(true);
            setTimeout(() => {
                onComplete?.();
            }, 2000);
        }
    };

    const activeItem = activeId ? itemsById.get(activeId) : null;
    const allPaid = splits.every((s) => s.paid || s.itemIds.length === 0);
    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="p-4 max-w-4xl mx-auto relative">
            {/* Celebration overlay */}
            {showCelebration && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="glass rounded-3xl p-8 text-center animate-scale-in">
                        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-soft">
                            <PartyPopper className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            ¡Cuenta Completada!
                        </h2>
                        <p className="text-gray-500">Todos los pagos han sido procesados</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6 animate-slide-up">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    Dividir Cuenta
                    <Sparkles className="w-6 h-6 text-brand-500" />
                </h2>
                <button
                    onClick={addSplit}
                    className="flex items-center gap-2 px-5 py-3 glass hover:bg-white/80 dark:hover:bg-gray-700/80
                             rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" />
                    Agregar persona
                </button>
            </div>

            {/* Total */}
            <div className="glass rounded-2xl p-5 mb-6 flex justify-between items-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div>
                    <span className="text-sm text-gray-500">Total de la cuenta</span>
                    <p className="text-3xl font-bold text-brand-600">
                        {formatPrice(totalAmount)}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-sm text-gray-500">Dividido en</span>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{splits.length} personas</p>
                </div>
            </div>

            {/* Split Containers */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {splits.map((split, index) => (
                        <div key={split.id} className="relative animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
                            {splits.length > 2 && !split.paid && (
                                <button
                                    onClick={() => removeSplit(split.id)}
                                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white
                                             rounded-full flex items-center justify-center z-10 shadow-lg
                                             transition-all duration-300 hover:scale-110"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                            )}
                            <SplitContainer
                                split={split}
                                items={getSplitItems(split)}
                                total={getSplitTotal(split)}
                                onPay={handlePay}
                            />
                        </div>
                    ))}
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeItem ? (
                        <div className="p-4 glass rounded-xl border-2 border-brand-500 shadow-2xl rotate-3">
                            <div className="font-semibold">{activeItem.name}</div>
                            <div className="text-sm text-gray-500">×{activeItem.quantity}</div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Complete Button */}
            {allPaid && !showCelebration && (
                <div className="mt-8 text-center animate-slide-up">
                    <div className="inline-flex items-center gap-2 text-green-600 font-semibold text-lg mb-4 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <Check className="w-5 h-5" />
                        Cuenta pagada completamente
                    </div>
                    <br />
                    <button
                        onClick={onComplete}
                        className="btn-primary inline-flex items-center gap-2 text-lg px-8"
                    >
                        <Check className="w-5 h-5" />
                        Cerrar Mesa
                    </button>
                </div>
            )}
        </div>
    );
}
