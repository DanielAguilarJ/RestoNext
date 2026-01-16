'use client';

/**
 * Category Tabs Component
 * Horizontal scrollable category navigation
 */

import React, { useRef, useEffect } from 'react';
import type { MenuCategory } from '../types';

interface CategoryTabsProps {
    categories: MenuCategory[];
    activeCategory: string | null;
    onSelectCategory: (categoryId: string) => void;
}

export function CategoryTabs({ categories, activeCategory, onSelectCategory }: CategoryTabsProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLButtonElement>(null);
    
    // Scroll active tab into view
    useEffect(() => {
        if (activeRef.current && scrollRef.current) {
            const container = scrollRef.current;
            const activeTab = activeRef.current;
            const containerRect = container.getBoundingClientRect();
            const activeRect = activeTab.getBoundingClientRect();
            
            if (activeRect.left < containerRect.left || activeRect.right > containerRect.right) {
                activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [activeCategory]);
    
    return (
        <div className="sticky top-[57px] z-30 bg-white border-b border-gray-100">
            <div 
                ref={scrollRef}
                className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
            >
                {categories.map(category => {
                    const isActive = activeCategory === category.id;
                    return (
                        <button
                            key={category.id}
                            ref={isActive ? activeRef : undefined}
                            onClick={() => onSelectCategory(category.id)}
                            className={`
                                flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
                                transition-all duration-200
                                ${isActive 
                                    ? 'bg-orange-500 text-white shadow-md' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }
                            `}
                        >
                            {category.icon && <span className="mr-1">{category.icon}</span>}
                            {category.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
