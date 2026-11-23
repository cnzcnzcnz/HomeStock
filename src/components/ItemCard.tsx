import React, { useState } from 'react';
import {
  Plus,
  Minus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ImageOff,
  Home,
  ArrowRightLeft
} from 'lucide-react';
import { HomeDefinition, HomeId, Item } from '../types/inventory';
import {
  calculateRestockQty,
  getCentralHome,
  getHomeLabel,
  getNormalizedHomeStocks,
  normalizeHomesList
} from '../utils/inventory';

interface ItemCardProps {
  item: Item;
  homes: HomeDefinition[];
  activeHome?: HomeId | 'all';
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onOpenPickForItem?: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  homes,
  activeHome = 'all',
  onIncrement,
  onDecrement,
  onEdit,
  onDelete,
  onOpenPickForItem
}) => {
  const [imgError, setImgError] = useState(false);
  const normalizedHomes = normalizeHomesList(homes);
  const centralHome = getCentralHome(normalizedHomes);
  const branchHomes = normalizedHomes.filter(h => h.id !== centralHome.id);
  const restockQty = calculateRestockQty(item.targetMonthlyStock, item.currentStock);
  const homeStocks = getNormalizedHomeStocks(item, normalizedHomes);
  const displayedStock =
    activeHome === 'all' ? item.currentStock : (homeStocks[activeHome] ?? 0);
  const primaryHome: HomeId =
    item.homeId && normalizedHomes.some(h => h.id === item.homeId)
      ? item.homeId
      : centralHome.id;
  const centralAvailable = homeStocks[centralHome.id] || 0;

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

        {/* Category & Home Pill */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1 max-w-[60%]">
          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-stone-900/80 text-stone-100 backdrop-blur-md shadow-sm border border-stone-700/50 truncate max-w-full">
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

        {/* Bottom-left primary Home badge */}
        <div className="absolute bottom-2 left-2 max-w-[65%]">
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-white/90 text-stone-900 backdrop-blur-sm shadow-xs border border-stone-200/80 max-w-full">
            <Home className="w-2.5 h-2.5 text-amber-600 shrink-0" />
            <span className="truncate">{getHomeLabel(primaryHome, true, normalizedHomes)}</span>
          </span>
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
      <div className="p-4 flex-1 flex flex-col">
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

          {/* Per-Home Stock Distribution Chips */}
          <div className="mt-2.5 flex flex-wrap gap-1 text-[10px]">
            {normalizedHomes.map(homeObj => {
              const count = homeStocks[homeObj.id] ?? 0;
              const isSelected = activeHome === homeObj.id;
              return (
                <div
                  key={homeObj.id}
                  className={`px-2 py-1 rounded-lg border font-mono inline-flex items-center gap-1 max-w-full ${
                    isSelected
                      ? 'bg-amber-50 border-amber-300 text-stone-900 font-bold'
                      : count > 0
                      ? 'bg-stone-50 border-stone-200 text-stone-700'
                      : 'bg-stone-50/50 border-stone-100 text-stone-400'
                  }`}
                  title={getHomeLabel(homeObj.id, true, normalizedHomes)}
                >
                  <span className="font-sans font-semibold truncate max-w-[90px]">
                    {homeObj.name}:
                  </span>
                  <span className="font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock & Math Column Summary */}
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-600 gap-2">
            <span className="shrink-0">Target Monthly:</span>
            <span className="font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded text-xs truncate max-w-[60%] text-right">
              {item.targetMonthlyStock} {item.unit || 'units'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-600 gap-1.5">
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
                {activeHome === 'all'
                  ? 'Current Stock'
                  : `${getHomeLabel(activeHome, false, normalizedHomes)} Stock`}
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-extrabold text-stone-900 tracking-tight font-mono">
                  {displayedStock}
                </span>
                {item.unit && (
                  <span className="text-xs text-stone-500 font-medium">
                    {item.unit}
                  </span>
                )}
              </div>
              {activeHome !== 'all' && (
                <span className="text-[10px] text-stone-400 block">
                  Total all homes: {item.currentStock}
                </span>
              )}
            </div>

            {/* Custom action buttons '+' and '-' */}
            <div className="flex items-center space-x-2" role="group" aria-label="Adjust stock">
              <button
                type="button"
                onClick={() => onDecrement(item.id)}
                disabled={displayedStock <= 0}
                aria-label={`Decrement ${item.itemName} stock`}
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-stone-800 transition-all ${
                  displayedStock <= 0
                    ? 'opacity-40 cursor-not-allowed bg-stone-200 text-stone-400'
                    : 'bg-white hover:bg-stone-100 active:scale-90 text-stone-800 shadow-sm border border-stone-300 hover:border-stone-400'
                }`}
                title="Decrement Stock (-1)"
              >
                <Minus className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={() => onIncrement(item.id)}
                aria-label={`Increment ${item.itemName} stock`}
                className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-90 text-stone-950 font-bold shadow-sm transition-all flex items-center justify-center"
                title="Increment Stock (+1)"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Quick Pick from Central Home Action if Central Home has stock */}
          {onOpenPickForItem && centralAvailable > 0 && branchHomes.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenPickForItem(item)}
              className="w-full py-1.5 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-colors"
              aria-label={`Pick ${item.itemName} from ${centralHome.name}`}
            >
              <ArrowRightLeft className="w-3 h-3 text-amber-700 shrink-0" />
              <span className="truncate">
                {activeHome !== 'all' && activeHome !== centralHome.id
                  ? `Pick from ${centralHome.name} (${centralAvailable} avail)`
                  : `Send ${centralHome.name} → Other Homes (${centralAvailable} avail)`}
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

