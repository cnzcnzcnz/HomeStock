import React, { useMemo, useState } from 'react';
import { Search, Filter, AlertTriangle, CheckCircle, PackageOpen, Plus, Sparkles } from 'lucide-react';
import { Item } from '../types/inventory';
import { ItemCard } from './ItemCard';
import { calculateRestockQty, CATEGORIES } from '../utils/inventory';

interface GridViewProps {
  items: Item[];
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onOpenAddItem: () => void;
  onSwitchToShoppingList: () => void;
}

export const GridView: React.FC<GridViewProps> = ({
  items,
  onIncrement,
  onDecrement,
  onEdit,
  onDelete,
  onOpenAddItem,
  onSwitchToShoppingList
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'needs_restock' | 'stocked'>('all');

  // Compute overall inventory metrics
  const metrics = useMemo(() => {
    let outOfStockCount = 0;
    let needsRestockCount = 0;
    let totalRestockUnits = 0;

    items.forEach(item => {
      const restock = calculateRestockQty(item.targetMonthlyStock, item.currentStock);
      if (item.currentStock <= 0) outOfStockCount++;
      if (restock > 0) {
        needsRestockCount++;
        totalRestockUnits += restock;
      }
    });

    return {
      total: items.length,
      needsRestock: needsRestockCount,
      outOfStock: outOfStockCount,
      totalRestockUnits
    };
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search
      const matchesSearch =
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      // Stock status
      const restock = calculateRestockQty(item.targetMonthlyStock, item.currentStock);
      let matchesStock = true;
      if (stockFilter === 'needs_restock') {
        matchesStock = restock > 0;
      } else if (stockFilter === 'stocked') {
        matchesStock = restock <= 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [items, searchTerm, selectedCategory, stockFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Items */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Total Household Items
            </span>
            <div className="text-2xl font-black text-stone-900 mt-0.5">
              {metrics.total}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
            <PackageOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Items Needing Restock */}
        <div
          onClick={onSwitchToShoppingList}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSwitchToShoppingList();
          }}
          className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-rose-300 hover:shadow-md transition-all group"
          title="Click to view Shopping List"
        >
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                Needs Restock
              </span>
              <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">
                Restock Qty &gt; 0
              </span>
            </div>
            <div className="text-2xl font-black text-rose-600 mt-0.5 flex items-baseline space-x-1">
              <span>{metrics.needsRestock}</span>
              <span className="text-xs text-rose-500 font-medium">items</span>
              <span className="text-xs text-stone-400 font-normal ml-2 group-hover:text-rose-600 transition-colors">
                View List →
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* In Stock / Adequate */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Fully Stocked
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5 flex items-baseline space-x-1">
              <span>{metrics.total - metrics.needsRestock}</span>
              <span className="text-xs text-emerald-600 font-medium">items</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by item name, category, or location..."
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-stone-900 placeholder-stone-400"
            />
          </div>

          {/* Quick Stock Status Filter */}
          <div className="flex rounded-xl bg-stone-100 p-1 border border-stone-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                stockFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Items
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('needs_restock')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                stockFilter === 'needs_restock'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-stone-600 hover:text-rose-700'
              }`}
            >
              Needs Restock ({metrics.needsRestock})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('stocked')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                stockFilter === 'stocked'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-emerald-700'
              }`}
            >
              Stocked
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <span className="text-stone-400 font-medium mr-1 flex items-center text-xs shrink-0">
            <Filter className="w-3.5 h-3.5 mr-1" /> Category:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              selectedCategory === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map(category => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                selectedCategory === category
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Items */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md mx-auto my-8">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <PackageOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-stone-800 text-base mb-1">
            No items found
          </h3>
          <p className="text-xs text-stone-500 mb-4">
            Try adjusting your search terms or filters to find what you need.
          </p>
          <div className="flex justify-center gap-2">
            {(searchTerm || selectedCategory !== 'all' || stockFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setStockFilter('all');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAddItem}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Item</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
