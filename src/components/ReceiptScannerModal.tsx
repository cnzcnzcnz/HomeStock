import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Receipt,
  Sparkles,
  Key,
  AlertCircle,
  Check,
  CheckCircle2,
  RefreshCw,
  Plus,
  ArrowRight,
  Store,
  DollarSign,
  Tag,
  Loader2,
  HelpCircle,
  PackageCheck
} from 'lucide-react';
import { HomeDefinition, HomeId, HomeStocks, Item, ReceiptItemMatched, ShoppingReceiptRecord } from '../types/inventory';
import {
  getCentralHome,
  getNormalizedHomeStocks,
  getTotalStockFromHomes,
  normalizeHomesList
} from '../utils/inventory';
import {
  getStoredOpenAIApiKey,
  saveStoredOpenAIApiKey,
  getStoredOpenAIModel,
  saveStoredOpenAIModel,
  SUPPORTED_MODELS,
  parseReceiptWithOpenAI,
  matchReceiptItemToInventory,
  ReceiptScanResult,
  formatRupiah
} from '../utils/receiptScanner';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingItems: Item[];
  homes: HomeDefinition[];
  onApplyReceipt: (
    receiptRecord: ShoppingReceiptRecord,
    updatedItems: Item[],
    newItemsCreated: Item[]
  ) => Promise<void>;
  currentUserName?: string;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  existingItems,
  homes,
  onApplyReceipt,
  currentUserName
}) => {
  const normalizedHomes = normalizeHomesList(homes);
  const centralHome = getCentralHome(normalizedHomes);

  const [apiKey, setApiKey] = useState(() => getStoredOpenAIApiKey());
  const [selectedModel, setSelectedModel] = useState(() => getStoredOpenAIModel());
  const [showKeySettings, setShowKeySettings] = useState(!getStoredOpenAIApiKey());
  const [tempApiKey, setTempApiKey] = useState(() => getStoredOpenAIApiKey());
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Review step after AI parsing
  const [parsedResult, setParsedResult] = useState<ReceiptScanResult | null>(null);
  const [editableStore, setEditableStore] = useState('');
  const [editableDate, setEditableDate] = useState('');
  const [editableTotal, setEditableTotal] = useState(0);
  const [editableDiscount, setEditableDiscount] = useState(0);
  const [destinationHomeId, setDestinationHomeId] = useState<HomeId>(centralHome.id);

  // Item matches that the user can verify/edit before applying
  interface ItemReviewRow {
    receiptName: string;
    quantity: number;
    price: number;
    matchedItemId: string; // empty string means "create new" or "skip"
    action: 'match_existing' | 'create_new' | 'skip';
    targetCategory: string;
  }
  const [reviewRows, setReviewRows] = useState<ItemReviewRow[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredOpenAIApiKey();
      const activeCentral = getCentralHome(normalizeHomesList(homes));
      setApiKey(stored);
      setTempApiKey(stored);
      setSelectedModel(getStoredOpenAIModel());
      setShowKeySettings(!stored);
      setDestinationHomeId(activeCentral.id);
      setScanError(null);
    }
  }, [isOpen, homes]);

  if (!isOpen) return null;

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tempApiKey.trim();
    saveStoredOpenAIApiKey(clean);
    saveStoredOpenAIModel(selectedModel);
    setApiKey(clean);
    setSavedKeySuccess(true);
    setTimeout(() => {
      setSavedKeySuccess(false);
      if (clean) setShowKeySettings(false);
    }, 1200);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setScanError('Please choose a valid image file (JPEG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setImagePreview(b64);
      setScanError(null);
      setParsedResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleScanWithAI = async () => {
    if (!imagePreview) {
      setScanError('Please select or upload a receipt photo first.');
      return;
    }
    if (!apiKey) {
      setShowKeySettings(true);
      setScanError('Please configure your OpenAI API Key before scanning.');
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const result = await parseReceiptWithOpenAI(imagePreview, apiKey, existingItems, selectedModel);
      setParsedResult(result);
      setEditableStore(result.storeName);
      setEditableDate(result.purchaseDate);
      setEditableTotal(result.totalSpent);
      setEditableDiscount(result.discountAmount);

      // Match each detected item to existing items
      const rows: ItemReviewRow[] = result.detectedItems.map(det => {
        const match = matchReceiptItemToInventory(det.name, existingItems);
        return {
          receiptName: det.name,
          quantity: det.quantity,
          price: det.price || 0,
          matchedItemId: match.matchedItem ? match.matchedItem.id : '',
          action: match.matchedItem ? 'match_existing' : 'create_new',
          targetCategory: det.categorySuggestion || (match.matchedItem ? match.matchedItem.category : 'General Supplies')
        };
      });

      setReviewRows(rows);
    } catch (err: any) {
      console.error('Scan failed:', err);
      setScanError(err.message || 'Failed to scan receipt image. Please check your API key and image.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyToDatabase = async () => {
    if (!parsedResult) return;
    setIsApplying(true);

    try {
      const updatedExistingItems: Item[] = [...existingItems];
      const newlyCreatedItems: Item[] = [];
      const receiptItemsReport: ReceiptItemMatched[] = [];

      for (const row of reviewRows) {
        if (row.action === 'skip') {
          receiptItemsReport.push({
            receiptItemName: row.receiptName,
            quantity: row.quantity,
            price: row.price,
            status: 'unmatched_skipped'
          });
          continue;
        }

        if (row.action === 'match_existing' && row.matchedItemId) {
          const itemIdx = updatedExistingItems.findIndex(i => i.id === row.matchedItemId);
          if (itemIdx >= 0) {
            const currentItem = updatedExistingItems[itemIdx];
            const prevHomeStocks = getNormalizedHomeStocks(currentItem, normalizedHomes);
            const prevStock = getTotalStockFromHomes(prevHomeStocks);
            const nextHomeStocks = {
              ...prevHomeStocks,
              [destinationHomeId]: (prevHomeStocks[destinationHomeId] || 0) + row.quantity
            };
            const newStock = getTotalStockFromHomes(nextHomeStocks);

            updatedExistingItems[itemIdx] = {
              ...currentItem,
              homeId: currentItem.homeId || centralHome.id,
              homeStocks: nextHomeStocks,
              currentStock: newStock,
              updatedAt: new Date().toISOString()
            };

            receiptItemsReport.push({
              receiptItemName: row.receiptName,
              quantity: row.quantity,
              price: row.price,
              matchedItemId: currentItem.id,
              matchedItemName: currentItem.itemName,
              matchedCategory: currentItem.category,
              previousStock: prevStock,
              newStock: newStock,
              unit: currentItem.unit || 'units',
              status: 'matched_and_incremented'
            });
            continue;
          }
        }

        // Action is 'create_new'
        const newItemHomeStocks: HomeStocks = {};
        normalizedHomes.forEach(h => {
          newItemHomeStocks[h.id] = h.id === destinationHomeId ? row.quantity : 0;
        });
        const newItem: Item = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          itemName: row.receiptName,
          category: row.targetCategory || 'General Supplies',
          photo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
          targetMonthlyStock: Math.max(row.quantity * 2, 2),
          currentStock: row.quantity,
          homeId: destinationHomeId,
          homeStocks: newItemHomeStocks,
          unit: 'units',
          location: 'Pantry / Storage',
          notes: `Added from ${editableStore} receipt scan`,
          updatedAt: new Date().toISOString()
        };

        newlyCreatedItems.push(newItem);
        updatedExistingItems.unshift(newItem);

        receiptItemsReport.push({
          receiptItemName: row.receiptName,
          quantity: row.quantity,
          price: row.price,
          matchedItemId: newItem.id,
          matchedItemName: newItem.itemName,
          matchedCategory: newItem.category,
          previousStock: 0,
          newStock: row.quantity,
          unit: 'units',
          status: 'new_item_created'
        });
      }

      const receiptRecord: ShoppingReceiptRecord = {
        id: `receipt-${Date.now()}`,
        storeName: editableStore || 'Store',
        purchaseDate: editableDate || new Date().toISOString().split('T')[0],
        discountAmount: Number(editableDiscount) || 0,
        totalSpent: Number(editableTotal) || 0,
        currency: parsedResult.currency || 'Rp',
        destinationHomeId,
        receiptImageUrl: imagePreview || undefined,
        summaryNotes: parsedResult.notes,
        matchedItemsCount: receiptItemsReport.filter(i => i.status !== 'unmatched_skipped').length,
        items: receiptItemsReport,
        createdAt: new Date().toISOString(),
        scannedBy: currentUserName || 'Family Member'
      };

      await onApplyReceipt(receiptRecord, updatedExistingItems, newlyCreatedItems);
      onClose();
    } catch (e: any) {
      console.error(e);
      setScanError(e.message || 'Failed to update stock in database.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-stone-200 relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 id="receipt-modal-title" className="text-lg font-black text-stone-900 tracking-tight flex items-center gap-1.5">
                <span>AI Receipt Scanner</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {selectedModel === 'gpt-4o' ? 'OpenAI GPT-4o' : selectedModel === 'gpt-4o-mini' ? 'OpenAI GPT-4o Mini' : 'OpenAI GPT-5 Nano'}
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                Scan shopping receipt image to auto-match items and increment stock
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setShowKeySettings(!showKeySettings)}
              className={`p-2 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1 ${
                apiKey ? 'text-stone-500 hover:text-stone-900 hover:bg-stone-100' : 'text-amber-700 bg-amber-50 border border-amber-200 animate-pulse'
              }`}
              title="OpenAI API Key & Model Settings"
            >
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">{apiKey ? 'Model & Key' : 'Set Key'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 py-4 space-y-5">
          {/* API Key Panel (Collapsible) */}
          {showKeySettings && (
            <div className="bg-stone-50 border border-amber-200/80 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-150 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>OpenAI API Key & Model Configuration</span>
                </span>
                {apiKey && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                    Key Active
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">
                Your key is used exclusively for scanning receipts via OpenAI Vision. It is saved locally in your browser storage and never exposed.
              </p>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block mb-1">
                  AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const m = e.target.value;
                    setSelectedModel(m);
                    saveStoredOpenAIModel(m);
                  }}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  {SUPPORTED_MODELS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleSaveApiKey} className="flex gap-2">
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
                >
                  Save Settings
                </button>
              </form>

              {savedKeySuccess && (
                <div className="mt-2 text-xs text-emerald-700 flex items-center space-x-1 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Settings saved successfully!</span>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {scanError && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start space-x-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold">Scan Notice</p>
                <p>{scanError}</p>
              </div>
            </div>
          )}

          {/* STEP 1: Upload / Take Photo (if not parsed yet) */}
          {!parsedResult ? (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 flex items-center justify-center max-h-72">
                  <img
                    src={imagePreview}
                    alt="Receipt preview"
                    className="max-h-72 object-contain w-auto mx-auto"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setScanError(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-xl text-xs transition-all backdrop-blur-xs"
                    title="Remove Photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-3xl p-8 sm:p-12 text-center cursor-pointer bg-stone-50/50 hover:bg-amber-50/20 transition-all group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    <Camera className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-stone-900">
                    Snap or Upload Receipt Photo
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                    Take a clear picture of your store receipt or select an image file from your device.
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white border border-stone-200 shadow-xs text-stone-700 font-bold text-xs rounded-xl group-hover:border-amber-400 group-hover:text-stone-900 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    <span>Choose Image File</span>
                  </button>
                </div>
              )}

              {/* Scan Action Button */}
              {imagePreview && (
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={handleScanWithAI}
                  className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Reading Receipt with OpenAI Vision...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Process & Extract Receipt Data</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            /* STEP 2: Review & Match Results Before Applying */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Receipt Summary Card */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center space-x-1">
                    <Store className="w-3.5 h-3.5 text-amber-600" />
                    <span>Receipt Summary</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedResult(null);
                      setImagePreview(null);
                    }}
                    className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 transition-colors"
                  >
                    Rescan
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                      Store Name
                    </label>
                    <input
                      type="text"
                      value={editableStore}
                      onChange={(e) => setEditableStore(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                      Date (DD-MM-YYYY)
                    </label>
                    <input
                      type="text"
                      value={editableDate}
                      onChange={(e) => setEditableDate(e.target.value)}
                      placeholder="DD-MM-YYYY (e.g. 28-10-2026)"
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                      Receive Into Home
                    </label>
                    <select
                      value={destinationHomeId}
                      onChange={(e) => setDestinationHomeId(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900"
                    >
                      {normalizedHomes.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.isCentral ? `${h.name} (Central)` : h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                      Total Spent (Rp)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={editableTotal}
                      onChange={(e) => setEditableTotal(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                      Discount (Rp)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={editableDiscount}
                      onChange={(e) => setEditableDiscount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Items Matching List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center space-x-1.5">
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                    <span>Review Extracted Items ({reviewRows.length})</span>
                  </h4>
                  <span className="text-[11px] text-stone-500">
                    Auto-matched against existing stock
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {reviewRows.map((row, idx) => {
                    const matchedItem = existingItems.find(i => i.id === row.matchedItemId);

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs transition-all ${
                          row.action === 'skip'
                            ? 'bg-stone-100/60 border-stone-200 opacity-60'
                            : row.action === 'match_existing'
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-amber-50/40 border-amber-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="font-bold text-stone-950 text-xs sm:text-sm">
                                {row.receiptName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded font-black bg-stone-900 text-white text-[10px]">
                                Qty: {row.quantity}
                              </span>
                              {row.price > 0 && (
                                <span className="text-stone-600 text-[11px] font-semibold">
                                  {formatRupiah(row.price)} / unit
                                  {row.quantity > 1 && (
                                    <span className="text-stone-400 font-normal ml-1">
                                      (Total: {formatRupiah(row.price * row.quantity)})
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Destination Info */}
                            <div className="mt-1 text-[11px]">
                              {row.action === 'match_existing' && matchedItem && (
                                <span className="text-emerald-800 font-semibold flex items-center space-x-1">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Matches: <strong>{matchedItem.itemName}</strong> (Current Stock: {matchedItem.currentStock} → {matchedItem.currentStock + row.quantity})</span>
                                </span>
                              )}
                              {row.action === 'create_new' && (
                                <span className="text-amber-800 font-medium">
                                  Will create as new item in pantry (initial stock: {row.quantity})
                                </span>
                              )}
                              {row.action === 'skip' && (
                                <span className="text-stone-500 italic">
                                  Skipped (will not increment stock)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Selector Controls */}
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <select
                              value={row.action}
                              onChange={(e) => {
                                const newAction = e.target.value as any;
                                setReviewRows(prev =>
                                  prev.map((r, i) => (i === idx ? { ...r, action: newAction } : r))
                                );
                              }}
                              className="px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-800"
                            >
                              <option value="match_existing">Increment Existing Item</option>
                              <option value="create_new">Add As New Item</option>
                              <option value="skip">Skip Stocking</option>
                            </select>

                            {/* If match_existing, allow picking which item */}
                            {row.action === 'match_existing' && (
                              <select
                                value={row.matchedItemId}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  setReviewRows(prev =>
                                    prev.map((r, i) => (i === idx ? { ...r, matchedItemId: id } : r))
                                  );
                                }}
                                className="px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs text-stone-800 max-w-[140px] truncate"
                              >
                                <option value="">Select Item...</option>
                                {existingItems.map(item => (
                                  <option key={item.id} value={item.id}>
                                    {item.itemName} ({item.currentStock})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Confirm Button */}
        {parsedResult && (
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setParsedResult(null);
                setImagePreview(null);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              Cancel & Retake
            </button>

            <button
              type="button"
              disabled={isApplying}
              onClick={handleApplyToDatabase}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center space-x-2 disabled:opacity-60"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Stock Levels...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>Confirm & Increment Stock in Database</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
