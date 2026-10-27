import React, { useState } from 'react';
import { Plus, Minus, Edit2, Trash2, AlertCircle, CheckCircle2, ImageOff, ShoppingBag } from 'lucide-react';
import { Item } from '../types/inventory';
import { calculateRestockQty, getItemStockStatus } from '../utils/inventory';

interface ItemCardProps {
  item: Item;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onIncrement,
  onDecrement,
  onEdit,
  onDelete
}) => {
  const [imgError, setImgError] = useState(false);
  const restockQty = calculateRestockQty(item.targetMonthlyStock, item.currentStock);
  const status = getItemStockStatus(item.targetMonthlyStock, item.currentStock);

  return (
    <article
      className="group bg-white rounded-2xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden hover:border-amber-300/80"
      aria-label={`Item ${item.itemName}`}
    >
      {/* Photo Container */}
      <div className="relative w-full h-48 bg-stone-100 overflow-hidden">
        {!imgError && item.photo ? (
          <img
            src={item.photo}
            alt={item.itemName}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-100 p-4">
            <ImageOff className="w-8 h-8 mb-1 text-stone-300" />
            <span className="text-xs text-stone-400">Photo unavailable</span>
          </div>
        )}

        {/* Category Pill */}
        <div className="absolute top-3 left-3">
          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-stone-900/80 text-stone-100 backdrop-blur-md shadow-sm border border-stone-700/50">
            {item.category}
          </span>
        </div>

        {/* Top-right status badge */}
        <div className="absolute top-3 right-3 flex items-center space-x-1">
          {restockQty > 0 ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold rounded-md bg-rose-600/90 text-white backdrop-blur-md shadow-sm border border-rose-400/30">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              Restock: +{restockQty}
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600/90 text-white backdrop-blur-md shadow-sm border border-emerald-400/30">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Stocked
            </span>
          )}
        </div>

        {/* Card Overlay Actions for edit/delete */}
        <div className="absolute bottom-2 right-2 flex space-x-1 opacity-90 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg bg-stone-900/70 hover:bg-stone-900 text-stone-200 hover:text-white backdrop-blur-sm shadow transition-colors"
            title="Edit item details"
            aria-label={`Edit ${item.itemName}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="p-1.5 rounded-lg bg-stone-900/70 hover:bg-rose-700 text-stone-200 hover:text-white backdrop-blur-sm shadow transition-colors"
            title="Delete item"
            aria-label={`Delete ${item.itemName}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-stone-900 text-base leading-snug line-clamp-2">
              {item.itemName}
            </h3>
          </div>
          {item.location && (
            <p className="text-xs text-stone-500 mt-0.5">
              📍 {item.location}
            </p>
          )}
        </div>

        {/* Stock & Math Column Summary */}
        <div className="mt-4 pt-3 border-t border-stone-100">
          <div className="flex items-center justify-between text-xs text-stone-600 mb-2 gap-2">
            <span className="shrink-0">Target Monthly:</span>
            <span className="font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded text-xs truncate max-w-[60%] text-right">
              {item.targetMonthlyStock} {item.unit || 'units'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-600 mb-3 gap-1.5">
            <span className="shrink-0">
              Restock Qty <span className="text-[10px] text-stone-400">(T - C)</span>:
            </span>
            <span
              className={`font-mono font-bold text-xs px-2 py-0.5 rounded shrink-0 ${
                restockQty > 0
                  ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {restockQty > 0 ? `+${restockQty}` : restockQty} {item.unit || 'units'}
            </span>
          </div>

          {/* Current Stock with custom '+' and '-' buttons */}
          <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-200/80 flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Current Stock
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-extrabold text-stone-900 tracking-tight font-mono">
                  {item.currentStock}
                </span>
                {item.unit && (
                  <span className="text-xs text-stone-500 font-medium">
                    {item.unit}
                  </span>
                )}
              </div>
            </div>

            {/* Custom action buttons '+' and '-' */}
            <div className="flex items-center space-x-2" role="group" aria-label="Adjust stock">
              <button
                type="button"
                onClick={() => onDecrement(item.id)}
                disabled={item.currentStock <= 0}
                aria-label={`Decrement ${item.itemName} stock`}
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-stone-800 transition-all ${
                  item.currentStock <= 0
                    ? 'opacity-40 cursor-not-allowed bg-stone-200 text-stone-400'
                    : 'bg-white hover:bg-stone-100 active:scale-90 text-stone-800 shadow-sm border border-stone-300 hover:border-stone-400'
                }`}
                title="Decrement Current Stock (-1)"
              >
                <Minus className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={() => onIncrement(item.id)}
                aria-label={`Increment ${item.itemName} stock`}
                className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-90 text-stone-950 font-bold shadow-sm transition-all flex items-center justify-center"
                title="Increment Current Stock (+1)"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
