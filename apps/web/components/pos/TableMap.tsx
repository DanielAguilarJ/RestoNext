"use client";

/**
 * Table Map Component
 * Visual grid of restaurant tables with color-coded status
 * 
 * Status Colors:
 * - Green: Free (available)
 * - Red: Occupied (has active order)
 * - Yellow: Bill Requested
 */

import { usePOSStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

interface TableMapProps {
    onTableSelect?: (tableId: string) => void;
}

export function TableMap({ onTableSelect }: TableMapProps) {
    const { tables, selectedTable, setSelectedTable } = usePOSStore();

    const handleTableClick = (table: typeof tables[0]) => {
        setSelectedTable(table);
        onTableSelect?.(table.id);
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case "free":
                return "table-free hover:bg-green-500/30";
            case "occupied":
                return "table-occupied hover:bg-red-500/30";
            case "bill_requested":
                return "table-bill-requested hover:bg-yellow-500/30";
            default:
                return "";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "free":
                return "Libre";
            case "occupied":
                return "Ocupada";
            case "bill_requested":
                return "Pide cuenta";
            default:
                return status;
        }
    };

    return (
        <div className="p-4">
            {/* Legend */}
            <div className="flex gap-4 mb-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span>Libre</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500" />
                    <span>Ocupada</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500" />
                    <span>Pide Cuenta</span>
                </div>
            </div>

            {/* Table Grid */}
            <div className="grid grid-cols-3 gap-4">
                {tables.map((table) => (
                    <button
                        key={table.id}
                        onClick={() => handleTableClick(table)}
                        className={cn(
                            "relative aspect-square rounded-xl p-4 transition-all duration-200",
                            "flex flex-col items-center justify-center",
                            "active:scale-95 touch-target",
                            getStatusClass(table.status),
                            selectedTable?.id === table.id && "ring-4 ring-brand-500 ring-offset-2"
                        )}
                    >
                        {/* Table Number */}
                        <span className="text-3xl font-bold">{table.number}</span>

                        {/* Capacity */}
                        <div className="flex items-center gap-1 mt-2 text-sm opacity-70">
                            <Users className="w-4 h-4" />
                            <span>{table.capacity}</span>
                        </div>

                        {/* Status Badge */}
                        <span className="absolute bottom-2 text-xs font-medium uppercase tracking-wide">
                            {getStatusLabel(table.status)}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
