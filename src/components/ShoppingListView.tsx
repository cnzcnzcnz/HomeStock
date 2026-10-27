import React, { useState } from 'react';
import {
  ShoppingBag,
  CheckCircle,
  Copy,
  Printer,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  PackageCheck,
  AlertCircle
} from 'lucide-react';
import { Item } from '../types/inventory';
import { getShoppingList } from '../utils/inventory';

interface ShoppingListViewProps {
  items: Item[];
  onRestockItem: (id: string, targetMonthlyStock: number) => void;
  onIncrementStock: (id: string) => void;
  onRestockAll: () => void;
  onNavigateToGrid: () => void;
}

export const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  items,
  onRestockItem,
  onIncrementStock,
  onRestockAll,
  onNavigateToGrid
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  // Filter ONLY items where Restock Qty > 0
  const shoppingItems = getShoppingList(items);

  // Group or filter by category if chosen
  const filteredShoppingItems = shoppingItems.filter(item => {
    return selectedCategory === 'all' || item.category === selectedCategory;
  });

  const totalRestockUnits = shoppingItems.reduce((acc, curr) => acc + curr.restockQty, 0);

  const availableCategories = Array.from(new Set(shoppingItems.map(i => i.category)));

  // Copy shopping list to clipboard
  const handleCopy = () => {
    const lines = [
      '🛒 Household Shopping List:',
      ...shoppingItems.map(
        item =>
          `• [ ] ${item.itemName}: Buy ${item.restockQty} ${item.unit || 'units'} (Current: ${item.currentStock}, Target: ${item.targetMonthlyStock})`
      ),
      `\nTotal: ${shoppingItems.length} items (${totalRestockUnits} units)`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleCheck = (id: string) => {
    setCheckedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">
              Shopping List
            </h2>
            <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-200">
              Restock Qty &gt; 0
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Displaying only household essentials that have fallen below their monthly target stock.
          </p>
        </div>

        {shoppingItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              title="Copy formatted list for SMS or Notes"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-500" />
                  <span>Copy List</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              title="Print shopping list"
            >
              <Printer className="w-4 h-4 text-stone-500" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onRestockAll}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-all shadow-sm active:scale-95"
              title="Restock all items to their monthly target values"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              <span>Restock All to Target</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {shoppingItems.length === 0 ? (
        /* Empty State: Everything is stocked! */
        <div className="bg-white rounded-3xl border border-stone-200/90 p-12 text-center max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-inner">
            <CheckCircle className="w-8 h-8 stroke-[2]" />
          </div>
          <h3 className="text-xl font-extrabold text-stone-900 mb-2">
            All Stocked Up!
          </h3>
          <p className="text-sm text-stone-500 mb-6 leading-relaxed">
            Every tracked item meets or exceeds its Target Monthly Stock. There are currently no items with a positive Restock Qty value.
          </p>
          <button
            type="button"
            onClick={onNavigateToGrid}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-md transition-all active:scale-95"
          >
            <span>Return to Grid View</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Strip & Category Filter */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center space-x-4 text-xs text-stone-600 font-medium">
              <span>
                Items to restock:{' '}
                <strong className="text-stone-900 font-bold">{shoppingItems.length}</strong>
              </span>
              <span>•</span>
              <span>
                Total units needed:{' '}
                <strong className="text-rose-600 font-bold font-mono">+{totalRestockUnits}</strong>
              </span>
            </div>

            {availableCategories.length > 1 && (
              <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-stone-900 text-white'
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  All ({shoppingItems.length})
                </button>
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-stone-900 text-white'
                        : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Shopping Items List */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100 overflow-hidden">
            {filteredShoppingItems.map(item => {
              const isChecked = !!checkedIds[item.id];
              const isCritical = item.currentStock === 0;

              return (
                <div
                  key={item.id}
                  className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                    isChecked ? 'bg-stone-50 opacity-75' : 'hover:bg-stone-50/70'
                  }`}
                >
                  {/* Item Left: Checkbox + Photo + Info */}
                  <div className="flex items-center space-x-4 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleCheck(item.id)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                        isChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-stone-300 hover:border-amber-500 bg-white'
                      }`}
                      aria-label={`Toggle check for ${item.itemName}`}
                    >
                      {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="w-14 h-14 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                      <img
                        src={item.photo}
                        alt={item.itemName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4
                          className={`font-bold text-stone-900 text-sm sm:text-base ${
                            isChecked ? 'line-through text-stone-400' : ''
                          }`}
                        >
                          {item.itemName}
                        </h4>
                        {isCritical && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Out of Stock
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-1">
                        <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-600">
                          {item.category}
                        </span>
                        {item.location && <span>📍 {item.location}</span>}
                        <span>
                          Current: <strong className="text-stone-800">{item.currentStock}</strong> / Target: {item.targetMonthlyStock}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Item Right: Restock Qty Badge + Quick Actions */}
                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 block">
                        Buy Quantity
                      </span>
                      <span className="inline-block px-3 py-1 rounded-xl font-mono font-extrabold text-base bg-rose-50 text-rose-700 border border-rose-200">
                        +{item.restockQty} {item.unit || 'units'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => onIncrementStock(item.id)}
                        className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors"
                        title="Add +1 to current stock"
                        aria-label={`Add 1 to ${item.itemName} current stock`}
                      >
                        +1
                      </button>

                      <button
                        type="button"
                        onClick={() => onRestockItem(item.id, item.targetMonthlyStock)}
                        className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-sm transition-all"
                        title="Restock to target monthly value"
                        aria-label={`Restock ${item.itemName} to target monthly stock`}
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Restock</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
