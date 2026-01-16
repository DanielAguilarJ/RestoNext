import { MenuCategory } from "../../../../packages/shared/src/index";

interface CategorySelectorProps {
    categories: MenuCategory[];
    selectedCategory: string | null;
    onSelectCategory: (categoryId: string) => void;
}

export function CategorySelector({ categories, selectedCategory, onSelectCategory }: CategorySelectorProps) {
    return (
        <div className="flex gap-2 p-4 overflow-x-auto glass sticky top-[72px] z-10 scrollbar-hide">
            {categories.map((cat, index) => (
                <button
                    key={cat.$id}
                    onClick={() => onSelectCategory(cat.$id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap
                   transition-all duration-300 font-medium animate-scale-in ${selectedCategory === cat.$id
                            ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30"
                            : "bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md"
                        }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                >
                    <span>{cat.name}</span>
                </button>
            ))}
        </div>
    );
}
