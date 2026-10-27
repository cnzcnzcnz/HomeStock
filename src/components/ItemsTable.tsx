import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Search,
  Filter,
  PackageOpen,
  ImageOff,
  Calculator
} from 'lucide-react';
import { Item } from '../types/inventory';
import { calculateRestockQty, CATEGORIES } from '../utils/inventory';

interface ItemsTableProps {
  items: Item[];
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onOpenAddItem: () => void;
}

type SortField = 'itemName' | 'category' | 'targetMonthlyStock' | 'currentStock' | 'restockQty';
type SortDirection = 'asc' | 'desc';

export const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  onIncrement,
  onDecrement,
  onEdit,
  onDelete,
  onOpenAddItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('itemName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter(item => {
        const matchesSearch =
          item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .map(item => ({
        ...item,
        restockQty: calculateRestockQty(item.targetMonthlyStock, item.currentStock)
      }))
      .sort((a, b) => {
        let valA: string | number = a[sortField];
        let valB: string | number = b[sortField];

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
  }, [items, searchTerm, categoryFilter, sortField, sortDirection]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-stone-400 opacity-60 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1 text-amber-500" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1 text-amber-500" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search table..."
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-stone-500 font-medium">
            Showing {filteredAndSortedItems.length} of {items.length} items
          </span>
          <button
            type="button"
            onClick={onOpenAddItem}
            className="flex items-center space-x-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" aria-label="Items Table">
            <thead>
              <tr className="bg-stone-900 text-stone-200 text-xs uppercase tracking-wider font-semibold border-b border-stone-800">
                {/* 1. Photo */}
                <th scope="col" className="py-3.5 px-4 w-20 text-center">
                  Photo
                </th>

                {/* 2. Item Name */}
                <th scope="col" className="py-3.5 px-4 cursor-pointer hover:bg-stone-800 transition-colors" onClick={() => handleSort('itemName')}>
                  <div className="flex items-center group">
                    <span>Item Name</span>
                    {renderSortIndicator('itemName')}
                  </div>
                </th>

                {/* 3. Category */}
                <th scope="col" className="py-3.5 px-4 cursor-pointer hover:bg-stone-800 transition-colors" onClick={() => handleSort('category')}>
                  <div className="flex items-center group">
                    <span>Category</span>
                    {renderSortIndicator('category')}
                  </div>
                </th>

                {/* 4. Target Monthly Stock */}
                <th scope="col" className="py-3.5 px-4 text-center cursor-pointer hover:bg-stone-800 transition-colors" onClick={() => handleSort('targetMonthlyStock')}>
                  <div className="flex items-center justify-center group">
                    <span>Target Monthly Stock</span>
                    {renderSortIndicator('targetMonthlyStock')}
                  </div>
                </th>

                {/* 5. Current Stock */}
                <th scope="col" className="py-3.5 px-4 text-center cursor-pointer hover:bg-stone-800 transition-colors" onClick={() => handleSort('currentStock')}>
                  <div className="flex items-center justify-center group">
                    <span>Current Stock</span>
                    {renderSortIndicator('currentStock')}
                  </div>
                </th>

                {/* 6. Math Column: Restock Qty */}
                <th
                  scope="col"
                  className="py-3.5 px-4 text-center bg-stone-950/90 text-amber-300 border-x border-stone-800 cursor-pointer hover:bg-stone-800 transition-colors"
                  onClick={() => handleSort('restockQty')}
                  title="Formula: Target Monthly Stock - Current Stock"
                >
                  <div className="flex items-center justify-center group">
                    <Calculator className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    <span>Restock Qty (Math)</span>
                    {renderSortIndicator('restockQty')}
                  </div>
                </th>

                {/* Actions */}
                <th scope="col" className="py-3.5 px-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {filteredAndSortedItems.length > 0 ? (
                filteredAndSortedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-stone-50/80 transition-colors group"
                  >
                    {/* Photo Column */}
                    <td className="py-3 px-4 text-center">
                      <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden mx-auto shrink-0 shadow-xs">
                        {item.photo ? (
                          <img
                            src={item.photo}
                            alt={item.itemName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300">
                            <ImageOff className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Item Name Column */}
                    <td className="py-3 px-4 font-semibold text-stone-900">
                      <div>
                        <span>{item.itemName}</span>
                        {item.location && (
                          <span className="block text-[11px] font-normal text-stone-500">
                            📍 {item.location}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category Column */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
                        {item.category}
                      </span>
                    </td>

                    {/* Target Monthly Stock Column */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-stone-700">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-stone-100 text-xs">
                        <span>{item.targetMonthlyStock}</span>
                        {item.unit && (
                          <span className="ml-1 text-[11px] text-stone-500 font-sans font-normal">
                            {item.unit}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Current Stock Column with +/- custom action buttons */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center space-x-1.5 bg-stone-50 px-2 py-1 rounded-xl border border-stone-200">
                        <button
                          type="button"
                          onClick={() => onDecrement(item.id)}
                          disabled={item.currentStock <= 0}
                          aria-label={`Decrement ${item.itemName} table stock`}
                          className="w-6 h-6 rounded-md bg-white hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed text-stone-800 shadow-2xs flex items-center justify-center font-bold text-xs transition-all"
                        >
                          <Minus className="w-3 h-3 stroke-[3]" />
                        </button>

                        <span className="w-8 text-center font-mono font-extrabold text-sm text-stone-900">
                          {item.currentStock}
                        </span>

                        <button
                          type="button"
                          onClick={() => onIncrement(item.id)}
                          aria-label={`Increment ${item.itemName} table stock`}
                          className="w-6 h-6 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-2xs flex items-center justify-center font-bold text-xs transition-all"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>
                      </div>
                    </td>

                    {/* Math Column: Restock Qty = (Target Monthly Stock - Current Stock) */}
                    <td className="py-3 px-4 text-center border-x border-stone-100 bg-stone-50/50">
                      {item.restockQty > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          +{item.restockQty} {item.unit || 'units'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {item.restockQty} (Full)
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                          title="Edit Item"
                          aria-label={`Edit ${item.itemName}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Item"
                          aria-label={`Delete ${item.itemName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <PackageOpen className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                    No items found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
