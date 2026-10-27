import React, { useState, useEffect } from 'react';
import { X, Image, Calculator, Sparkles, Check } from 'lucide-react';
import { Item } from '../types/inventory';
import { CATEGORIES, PHOTO_PRESETS, calculateRestockQty, clampStock } from '../utils/inventory';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<Item, 'id' | 'updatedAt'>, editId?: string) => void;
  initialItem?: Item | null;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem
}) => {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [photo, setPhoto] = useState('');
  const [targetMonthlyStock, setTargetMonthlyStock] = useState<number>(4);
  const [currentStock, setCurrentStock] = useState<number>(1);
  const [unit, setUnit] = useState('units');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<{ itemName?: string; target?: string; current?: string }>({});

  useEffect(() => {
    if (initialItem) {
      setItemName(initialItem.itemName);
      setCategory(initialItem.category);
      setPhoto(initialItem.photo);
      setTargetMonthlyStock(initialItem.targetMonthlyStock);
      setCurrentStock(initialItem.currentStock);
      setUnit(initialItem.unit || 'units');
      setLocation(initialItem.location || '');
    } else {
      setItemName('');
      setCategory(CATEGORIES[0]);
      setPhoto(PHOTO_PRESETS[0].url);
      setTargetMonthlyStock(4);
      setCurrentStock(1);
      setUnit('units');
      setLocation('Pantry');
    }
    setErrors({});
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  const restockQty = calculateRestockQty(targetMonthlyStock, currentStock);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { itemName?: string; target?: string; current?: string } = {};

    if (!itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }

    if (targetMonthlyStock < 0 || isNaN(targetMonthlyStock)) {
      newErrors.target = 'Target must be 0 or greater';
    }

    if (currentStock < 0 || isNaN(currentStock)) {
      newErrors.current = 'Current stock must be 0 or greater';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(
      {
        itemName: itemName.trim(),
        category,
        photo: photo.trim() || PHOTO_PRESETS[0].url,
        targetMonthlyStock: clampStock(targetMonthlyStock),
        currentStock: clampStock(currentStock),
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
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
          <div>
            <h3 id="item-modal-title" className="text-lg font-black text-stone-900 tracking-tight">
              {initialItem ? 'Edit Household Item' : 'Add New Household Item'}
            </h3>
            <p className="text-xs text-stone-500">
              Configure inventory targets and stock tracking.
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

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div>
              <label htmlFor="unitInput" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Unit / Container
              </label>
              <input
                id="unitInput"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. bottles, packs, cans, boxes"
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="locationInput" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Location (Optional)
            </label>
            <input
              id="locationInput"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Kitchen Pantry, Under Sink, Bathroom Vanity"
              className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Target Monthly Stock & Current Stock */}
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

            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <label htmlFor="currentStockInput" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Current Stock *
              </label>
              <input
                id="currentStockInput"
                type="number"
                min="0"
                step="1"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-base font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <span className="text-[11px] text-stone-500 block mt-1">
                On-hand inventory right now
              </span>
            </div>
          </div>

          {/* Live Math Column Calculation Preview */}
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-stone-700">
              <Calculator className="w-4 h-4 text-amber-600" />
              <span>
                Calculated <strong>Restock Qty</strong> (Target - Current):
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
