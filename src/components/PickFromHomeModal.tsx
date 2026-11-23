import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Warehouse,
  Home,
  ArrowRight,
  Search,
  Check,
  Minus,
  Plus,
  PackageOpen
} from 'lucide-react';
import { HomeDefinition, HomeId, Item } from '../types/inventory';
import { getCentralHome, getNormalizedHomeStocks, normalizeHomesList } from '../utils/inventory';

interface PickFromHomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  homes: HomeDefinition[];
  items: Item[];
  initialTargetHome?: HomeId;
  initialItemId?: string | null;
  onPickFromCentral: (itemId: string, toHomeId: HomeId, quantity: number) => Promise<void> | void;
}

export const PickFromHomeModal: React.FC<PickFromHomeModalProps> = ({
  isOpen,
  onClose,
  homes,
  items,
  initialTargetHome,
  initialItemId = null,
  onPickFromCentral
}) => {
  const normalizedHomes = useMemo(() => normalizeHomesList(homes), [homes]);
  const centralHome = useMemo(() => getCentralHome(normalizedHomes), [normalizedHomes]);
  const branchHomes = useMemo(
    () => normalizedHomes.filter(h => h.id !== centralHome.id),
    [normalizedHomes, centralHome]
  );

  const resolvedInitialTarget = useMemo(() => {
    if (initialTargetHome && branchHomes.some(h => h.id === initialTargetHome)) {
      return initialTargetHome;
    }
    return branchHomes[0]?.id || centralHome.id;
  }, [initialTargetHome, branchHomes, centralHome]);

  const [targetHome, setTargetHome] = useState<HomeId>(resolvedInitialTarget);
  const [searchTerm, setSearchTerm] = useState('');
  const [pickQuantities, setPickQuantities] = useState<Record<string, number>>({});
  const [recentPickedIds, setRecentPickedIds] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      setTargetHome(resolvedInitialTarget);
      setSearchTerm('');
      setPickQuantities({});
      setRecentPickedIds({});
    }
  }, [isOpen, resolvedInitialTarget, initialItemId]);

  const centralStockItems = useMemo(() => {
    const withCentral = items
      .map(item => {
        const stocks = getNormalizedHomeStocks(item, normalizedHomes);
        return {
          item,
          stocks,
          centralQty: stocks[centralHome.id] || 0,
          destQty: stocks[targetHome] || 0
        };
      })
      .filter(entry => entry.centralQty > 0)
      .filter(entry => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          entry.item.itemName.toLowerCase().includes(q) ||
          entry.item.category.toLowerCase().includes(q)
        );
      });

    if (initialItemId) {
      withCentral.sort((a, b) => {
        if (a.item.id === initialItemId) return -1;
        if (b.item.id === initialItemId) return 1;
        return a.item.itemName.localeCompare(b.item.itemName);
      });
    } else {
      withCentral.sort((a, b) => a.item.itemName.localeCompare(b.item.itemName));
    }

    return withCentral;
  }, [items, normalizedHomes, centralHome.id, targetHome, searchTerm, initialItemId]);

  if (!isOpen) return null;

  const getQtyFor = (itemId: string, maxAvailable: number) => {
    const val = pickQuantities[itemId] ?? 1;
    return Math.max(1, Math.min(val, maxAvailable));
  };

  const handleQtyChange = (itemId: string, next: number, maxAvailable: number) => {
    setPickQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, Math.min(next, maxAvailable))
    }));
  };

  const handlePick = async (itemId: string, centralQty: number) => {
    const qty = getQtyFor(itemId, centralQty);
    if (qty <= 0 || !targetHome || targetHome === centralHome.id) return;
    await onPickFromCentral(itemId, targetHome, qty);
    setRecentPickedIds(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + qty
    }));
    setPickQuantities(prev => ({ ...prev, [itemId]: 1 }));
  };

  const targetHomeName =
    branchHomes.find(h => h.id === targetHome)?.name || targetHome;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pick-from-home-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h2 id="pick-from-home-title" className="text-lg font-black text-stone-900 tracking-tight">
                Pick Stock from {centralHome.name} (Central)
              </h2>
              <p className="text-xs text-stone-500">
                Transfer centralized inventory from {centralHome.name} into another home
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label={`Close Pick from ${centralHome.name} modal`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Destination Home Selector + Search */}
        <div className="py-4 space-y-3 border-b border-stone-100 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Destination:
              </span>
              <div className="inline-flex flex-wrap gap-1 rounded-xl bg-stone-100 p-1 border border-stone-200">
                {branchHomes.map(homeObj => {
                  const active = targetHome === homeObj.id;
                  return (
                    <button
                      key={homeObj.id}
                      type="button"
                      onClick={() => setTargetHome(homeObj.id)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        active
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>{homeObj.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${centralHome.name} stock...`}
                className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* Available Items List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {branchHomes.length === 0 ? (
            <div className="text-center py-12 px-4">
              <h3 className="text-sm font-bold text-stone-800 mb-1">
                No destination homes configured
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Add at least one more home in Manage Homes to pick stock from {centralHome.name}.
              </p>
            </div>
          ) : centralStockItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                <PackageOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-800 mb-1">
                No available stock in {centralHome.name}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {searchTerm
                  ? `No ${centralHome.name} items matched your search.`
                  : `${centralHome.name} (Central) currently has 0 units available to pick. Add or restock items at ${centralHome.name} first.`}
              </p>
            </div>
          ) : (
            centralStockItems.map(({ item, centralQty, destQty }) => {
              const qty = getQtyFor(item.id, centralQty);
              const isHighlighted = initialItemId === item.id;
              const pickedCount = recentPickedIds[item.id] || 0;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    isHighlighted
                      ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                      <img
                        src={item.photo}
                        alt={item.itemName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                          {item.itemName}
                        </h4>
                        {pickedCount > 0 && (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            <Check className="w-3 h-3" />
                            <span>Picked +{pickedCount}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                        <span className="font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                          {centralHome.name}: {centralQty} {item.unit || 'units'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-stone-400" />
                        <span className="font-semibold text-stone-700 bg-stone-100 px-1.5 py-0.2 rounded">
                          {targetHomeName}: {destQty} {item.unit || 'units'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Qty Stepper & Pick CTA */}
                  <div className="flex items-center justify-end space-x-2 shrink-0">
                    <div className="flex items-center bg-stone-100 rounded-xl border border-stone-200 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.id, qty - 1, centralQty)}
                        disabled={qty <= 1}
                        aria-label={`Decrease pick quantity for ${item.itemName}`}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-stone-50 disabled:opacity-40 text-stone-700 flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-xs text-stone-900">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.id, qty + 1, centralQty)}
                        disabled={qty >= centralQty}
                        aria-label={`Increase pick quantity for ${item.itemName}`}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-stone-50 disabled:opacity-40 text-stone-700 flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePick(item.id, centralQty)}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-extrabold text-xs shadow-xs transition-all flex items-center space-x-1"
                    >
                      <span>Pick → {targetHomeName}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span>{centralStockItems.length} item(s) available in {centralHome.name} Central Stock</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
