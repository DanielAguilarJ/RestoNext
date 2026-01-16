import { MenuItem } from "../../../../packages/shared/src/index";
import { formatPrice } from "@/lib/utils";
import { Plus } from "lucide-react";

interface MenuGridProps {
    isLoading: boolean;
    items: MenuItem[];
    onAddItem: (item: MenuItem) => void;
}

export function MenuGrid({ isLoading, items, onAddItem }: MenuGridProps) {
    if (isLoading) {
        return (
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-4 animate-pulse">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map((item, index) => (
                    <button
                        key={item.$id}
                        onClick={() => onAddItem(item)}
                        className="card-interactive p-4 text-left animate-scale-in group bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md"
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/50 dark:to-brand-800/50 
                                      rounded-xl flex items-center justify-center mb-3
                                      group-hover:scale-110 transition-transform duration-300">
                            <span className="text-3xl">{item.image_url || "🥘"}</span>
                        </div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 min-h-[40px]">
                            {item.name}
                        </div>
                        <div className="text-brand-600 dark:text-brand-400 font-bold mt-2 text-lg">
                            {formatPrice(item.price)}
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-brand-600 dark:text-brand-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-3 h-3" />
                            <span>Agregar</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
