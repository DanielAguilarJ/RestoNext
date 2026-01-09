"use client";

/**
 * Split Check Component
 * 
 * Allows splitting a bill between multiple people using drag-and-drop.
 * Uses @dnd-kit for accessible, mobile-friendly drag and drop.
 * 
 * Split modes:
 * - By Seat: Auto-assign items based on seat number
 * - Even: Split total evenly between N people
 * - Custom: Drag items between splits manually
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
import { GripVertical, Plus, Minus, CreditCard, Banknote, Check } from "lucide-react";

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
                "flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200",
                "transition-all duration-200 touch-target",
                isDragging && "opacity-50 scale-105 shadow-lg border-brand-500"
            )}
        >
            <button
                {...attributes}
                {...listeners}
                className="touch-none p-1 hover:bg-gray-100 rounded"
            >
                <GripVertical className="w-5 h-5 text-gray-400" />
            </button>

            <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-gray-500">x{item.quantity}</div>
            </div>

            <div className="font-semibold text-brand-600">
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
                "bg-gray-50 rounded-xl p-4 min-h-[200px]",
                "border-2 border-dashed border-gray-300",
                split.paid && "bg-green-50 border-green-400"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    {split.label}
                    {split.paid && <Check className="w-5 h-5 text-green-600" />}
                </h3>
                <span className="text-xl font-bold text-brand-600">
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
                        <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
                            Arrastra productos aquí
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
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => onPay(split.id, "cash")}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4
                       bg-green-600 hover:bg-green-700 text-white rounded-lg
                       font-semibold transition-colors active:scale-95"
                    >
                        <Banknote className="w-5 h-5" />
                        Efectivo
                    </button>
                    <button
                        onClick={() => onPay(split.id, "card")}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4
                       bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                       font-semibold transition-colors active:scale-95"
                    >
                        <CreditCard className="w-5 h-5" />
                        Tarjeta
                    </button>
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
}

export function SplitCheck({ orderId, orderItems, onComplete }: SplitCheckProps) {
    const [splits, setSplits] = useState<Split[]>([
        { id: "split-1", label: "Persona 1", itemIds: orderItems.map(i => i.id), paid: false },
        { id: "split-2", label: "Persona 2", itemIds: [], paid: false },
    ]);

    const [activeId, setActiveId] = useState<string | null>(null);

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

        // Find source and destination splits
        const sourceSplit = splits.find((s) => s.itemIds.includes(activeItemId));

        // Check if dropped over a split container or another item
        let destSplit = splits.find((s) => s.id === overId);
        if (!destSplit) {
            // Dropped over another item, find its container
            destSplit = splits.find((s) => s.itemIds.includes(overId));
        }

        if (!sourceSplit || !destSplit || sourceSplit.id === destSplit.id) return;

        // Move item to new split
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

        // Move items to first split
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
    const handlePay = (splitId: string, method: "cash" | "card") => {
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
            onComplete?.();
        }
    };

    const activeItem = activeId ? itemsById.get(activeId) : null;
    const allPaid = splits.every((s) => s.paid || s.itemIds.length === 0);

    return (
        <div className="p-4 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Dividir Cuenta</h2>
                <button
                    onClick={addSplit}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200
                     rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Agregar persona
                </button>
            </div>

            {/* Total */}
            <div className="bg-brand-50 rounded-xl p-4 mb-6 flex justify-between items-center">
                <span className="text-lg">Total de la cuenta:</span>
                <span className="text-2xl font-bold text-brand-600">
                    {formatPrice(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0))}
                </span>
            </div>

            {/* Split Containers */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {splits.map((split) => (
                        <div key={split.id} className="relative">
                            {splits.length > 2 && !split.paid && (
                                <button
                                    onClick={() => removeSplit(split.id)}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white
                             rounded-full flex items-center justify-center z-10"
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
                        <div className="p-3 bg-white rounded-lg border-2 border-brand-500 shadow-lg">
                            <div className="font-medium">{activeItem.name}</div>
                            <div className="text-sm text-gray-500">x{activeItem.quantity}</div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Complete Button */}
            {allPaid && (
                <div className="mt-6 text-center">
                    <div className="text-green-600 font-semibold text-lg mb-4">
                        ✓ Cuenta pagada completamente
                    </div>
                    <button
                        onClick={onComplete}
                        className="btn-primary"
                    >
                        Cerrar Mesa
                    </button>
                </div>
            )}
        </div>
    );
}
