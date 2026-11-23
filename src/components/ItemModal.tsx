import React, { useState, useEffect } from 'react';
import { X, Calculator, Check, Home } from 'lucide-react';
import { HomeDefinition, HomeId, HomeStocks, Item } from '../types/inventory';
import {
  CATEGORIES,
  PHOTO_PRESETS,
  calculateRestockQty,
  clampStock,
  getCentralHome,
  getNormalizedHomeStocks,
  getTotalStockFromHomes,
  normalizeHomesList
} from '../utils/inventory';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<Item, 'id' | 'updatedAt'>, editId?: string) => void;
  homes: HomeDefinition[];
  initialItem?: Item | null;
  defaultHomeId?: HomeId;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  homes,
  initialItem,
  defaultHomeId
}) => {
  const normalizedHomes = normalizeHomesList(homes);
  const centralHome = getCentralHome(normalizedHomes);

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [photo, setPhoto] = useState('');
  const [targetMonthlyStock, setTargetMonthlyStock] = useState<number>(4);
  const [homeId, setHomeId] = useState<HomeId>(centralHome.id);
  const [homeStocks, setHomeStocks] = useState<HomeStocks>({});
  const [unit, setUnit] = useState('units');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<{ itemName?: string; target?: string; current?: string }>({});

  useEffect(() => {
    const activeHomes = normalizeHomesList(homes);
    const activeCentralId = getCentralHome(activeHomes).id;

    if (initialItem) {
      setItemName(initialItem.itemName);
      setCategory(initialItem.category);
      setPhoto(initialItem.photo);
      setTargetMonthlyStock(initialItem.targetMonthlyStock);
      const validPrimary =
        initialItem.homeId && activeHomes.some(h => h.id === initialItem.homeId)
          ? initialItem.homeId
          : activeCentralId;
      setHomeId(validPrimary);
      setHomeStocks(getNormalizedHomeStocks(initialItem, activeHomes));
      setUnit(initialItem.unit || 'units');
      setLocation(initialItem.location || '');
    } else {
      setItemName('');
      setCategory(CATEGORIES[0]);
      setPhoto(PHOTO_PRESETS[0].url);
      setTargetMonthlyStock(4);
      const startHome =
        defaultHomeId && activeHomes.some(h => h.id === defaultHomeId)
          ? defaultHomeId
          : activeCentralId;
      setHomeId(startHome);
      const initialStocks: HomeStocks = {};
      activeHomes.forEach(h => {
        initialStocks[h.id] = h.id === startHome ? 1 : 0;
      });
      setHomeStocks(initialStocks);
      setUnit('units');
      setLocation('Pantry');
    }
    setErrors({});
  }, [initialItem, isOpen, defaultHomeId, homes]);

  if (!isOpen) return null;

  const totalCurrentStock = getTotalStockFromHomes(homeStocks);
  const restockQty = calculateRestockQty(targetMonthlyStock, totalCurrentStock);

  const handleHomeStockChange = (target: HomeId, value: number) => {
    setHomeStocks(prev => ({
      ...prev,
      [target]: clampStock(value)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { itemName?: string; target?: string; current?: string } = {};

    if (!itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }

    if (targetMonthlyStock < 0 || isNaN(targetMonthlyStock)) {
      newErrors.target = 'Target must be 0 or greater';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const sanitizedStocks: HomeStocks = {};
    normalizedHomes.forEach(h => {
      sanitizedStocks[h.id] = clampStock(homeStocks[h.id] ?? 0);
    });

    onSave(
      {
        itemName: itemName.trim(),
        category,
        photo: photo.trim() || PHOTO_PRESETS[0].url,
        targetMonthlyStock: clampStock(targetMonthlyStock),
        currentStock: getTotalStockFromHomes(sanitizedStocks),
        homeId,
        homeStocks: sanitizedStocks,
        unit: unit.trim() || 'units',
        location: location.trim()
      },
      initialItem ? initialItem.id : undefined
    );
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 relative overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
          <div>
            <h3 id="item-modal-title" className="text-lg font-black text-stone-900 tracking-tight">
              {initialItem ? 'Edit Household Item' : 'Add New Household Item'}
            </h3>
            <p className="text-xs text-stone-500">
              Configure home categorization, targets, and per-home stock.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Name */}
          <div>
            <label htmlFor="itemNameInput" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Item Name *
            </label>
            <input
              id="itemNameInput"
              type="text"
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
                if (errors.itemName) setErrors(prev => ({ ...prev, itemName: undefined }));
              }}
              placeholder="e.g. Ground Dark Roast Coffee, Dishwashing Liquid"
              className={`w-full px-3.5 py-2 rounded-xl bg-stone-50 border text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                errors.itemName ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-stone-200'
              }`}
            />
            {errors.itemName && (
              <p className="text-xs text-rose-600 mt-1">{errors.itemName}</p>
            )}
          </div>

          {/* Primary Home & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="homeSelect" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Primary Home
              </label>
              <select
                id="homeSelect"
                value={homeId}
                onChange={(e) => setHomeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {normalizedHomes.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.isCentral ? `${h.name} (Central Hub)` : h.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="categorySelect" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Category
              </label>
              <select
                id="categorySelect"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="unitInput" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Unit / Container
              </label>
              <input
                id="unitInput"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. bottles, packs, cans"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div>
              <label htmlFor="locationInput" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Room / Shelf (Optional)
              </label>
              <input
                id="locationInput"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Kitchen Pantry, Under Sink"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* Target Monthly Stock + Total Current Stock Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <label htmlFor="targetStockInput" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Target Monthly Stock *
              </label>
              <input
                id="targetStockInput"
                type="number"
                min="0"
                step="1"
                value={targetMonthlyStock}
                onChange={(e) => setTargetMonthlyStock(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-base font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <span className="text-[11px] text-stone-500 block mt-1">
                Desired monthly quota
              </span>
            </div>

            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 flex flex-col justify-between">
              <span className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Total All Homes
              </span>
              <div className="text-2xl font-mono font-black text-stone-900">
                {totalCurrentStock}{' '}
                <span className="text-xs font-sans font-medium text-stone-500">{unit}</span>
              </div>
              <span className="text-[11px] text-stone-500 block">
                Sum across {normalizedHomes.length} home{normalizedHomes.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Per-Home Stock Distribution */}
          <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center space-x-1.5">
                <Home className="w-3.5 h-3.5 text-amber-600" />
                <span>Stock by Home</span>
              </span>
              <span className="text-[10px] text-stone-500">
                {centralHome.name} is Central Hub
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {normalizedHomes.map(h => (
                <div key={h.id}>
                  <label
                    htmlFor={`stock-${h.id}`}
                    className="block text-[10px] font-bold uppercase text-stone-600 mb-1 truncate"
                    title={h.isCentral ? `${h.name} (Central)` : h.name}
                  >
                    {h.isCentral ? `${h.name} (Central)` : h.name}
                  </label>
                  <input
                    id={`stock-${h.id}`}
                    type="number"
                    min="0"
                    step="1"
                    value={homeStocks[h.id] ?? 0}
                    onChange={(e) => handleHomeStockChange(h.id, Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 text-sm font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Live Math Column Calculation Preview */}
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-stone-700">
              <Calculator className="w-4 h-4 text-amber-600" />
              <span>
                Calculated <strong>Restock Qty</strong> (Target - Total):
              </span>
            </div>
            <div className="font-mono font-bold text-sm">
              {restockQty > 0 ? (
                <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                  +{restockQty} {unit}
                </span>
              ) : (
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {restockQty} (Stocked)
                </span>
              )}
            </div>
          </div>

          {/* Photo Section */}
          <div className="space-y-2">
            <label htmlFor="photoUrlInput" className="block text-xs font-bold uppercase tracking-wider text-stone-700">
              Photo URL / Quick Presets
            </label>
            <input
              id="photoUrlInput"
              type="url"
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />

            {/* Photo preset thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              {PHOTO_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setPhoto(preset.url);
                    if (!itemName) setItemName(preset.label);
                    setCategory(preset.category);
                  }}
                  className={`relative w-12 h-12 rounded-xl overflow-hidden border shrink-0 transition-transform hover:scale-105 ${
                    photo === preset.url
                      ? 'ring-2 ring-amber-500 border-amber-500'
                      : 'border-stone-200'
                  }`}
                  title={preset.label}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-full object-cover"
                  />
                  {photo === preset.url && (
                    <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 hover:text-stone-900 text-xs font-semibold hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs shadow-md transition-all"
            >
              {initialItem ? 'Save Changes' : 'Add Item to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

