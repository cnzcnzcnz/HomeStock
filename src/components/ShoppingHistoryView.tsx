import React, { useState } from 'react';
import {
  ShoppingBag,
  Store,
  Calendar,
  Tag,
  DollarSign,
  PackageCheck,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Receipt,
  Sparkles,
  ExternalLink,
  Search,
  ArrowRight,
  ArrowRightLeft,
  Home
} from 'lucide-react';
import { HomeDefinition, ShoppingReceiptRecord, StockTransferRecord, ViewTab } from '../types/inventory';
import { getCentralHome, getHomeLabel, normalizeHomesList } from '../utils/inventory';
import { formatRupiah } from '../utils/receiptScanner';

interface ShoppingHistoryViewProps {
  receipts: ShoppingReceiptRecord[];
  transfers?: StockTransferRecord[];
  homes: HomeDefinition[];
  onOpenScanner: () => void;
  onDeleteReceipt?: (id: string) => void;
  onNavigateToTab: (tab: ViewTab) => void;
}

export const ShoppingHistoryView: React.FC<ShoppingHistoryViewProps> = ({
  receipts,
  transfers = [],
  homes,
  onOpenScanner,
  onDeleteReceipt,
  onNavigateToTab
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(receipts[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedHomes = normalizeHomesList(homes);
  const centralHome = getCentralHome(normalizedHomes);

  // Calculate cumulative lifetime stats
  const totalSpentAll = receipts.reduce((sum, r) => sum + (Number(r.totalSpent) || 0), 0);
  const totalDiscountsAll = receipts.reduce((sum, r) => sum + (Number(r.discountAmount) || 0), 0);
  const totalItemsStockedAll = receipts.reduce((sum, r) => {
    return sum + (r.items?.reduce((itemSum, i) => itemSum + (i.quantity || 1), 0) || 0);
  }, 0);

  const filteredReceipts = receipts.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.storeName.toLowerCase().includes(q) ||
      r.purchaseDate.toLowerCase().includes(q) ||
      r.items.some(i => i.receiptItemName.toLowerCase().includes(q) || i.matchedItemName?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Receipt Scanner & Shopping Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Shopping Receipts & History Summary
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Scan paper and digital receipts with OpenAI Vision. Every scanned purchase automatically matches your household database and increments stock levels in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenScanner}
              className="flex items-center space-x-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-all active:scale-95"
            >
              <Receipt className="w-4 h-4 stroke-[2.5]" />
              <span>Scan New Receipt</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-stone-800">
          <div className="bg-stone-800/60 p-3 sm:p-4 rounded-2xl border border-stone-700/50">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">
              Receipts Scanned
            </span>
            <span className="text-xl sm:text-2xl font-black text-white">
              {receipts.length}
            </span>
          </div>

          <div className="bg-stone-800/60 p-3 sm:p-4 rounded-2xl border border-stone-700/50">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">
              Total Spent
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">
              {formatRupiah(totalSpentAll)}
            </span>
          </div>

          <div className="bg-stone-800/60 p-3 sm:p-4 rounded-2xl border border-stone-700/50">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">
              Total Discounts Saved
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">
              {formatRupiah(totalDiscountsAll)}
            </span>
          </div>

          <div className="bg-stone-800/60 p-3 sm:p-4 rounded-2xl border border-stone-700/50">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">
              Items Stocked
            </span>
            <span className="text-xl sm:text-2xl font-black text-sky-400">
              {totalItemsStockedAll}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipts by store name, date, or item..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        <div className="text-xs text-stone-500 font-medium">
          Showing <strong>{filteredReceipts.length}</strong> of {receipts.length} receipt records
        </div>
      </div>

      {/* Empty State */}
      {filteredReceipts.length === 0 && (
        <div className="bg-white rounded-3xl border border-dashed border-stone-300 p-10 sm:p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-sm">
            <Receipt className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-stone-900">
            {receipts.length === 0 ? 'No Shopping Receipts Yet' : 'No Receipts Match Your Search'}
          </h3>
          <p className="text-stone-500 text-xs sm:text-sm max-w-md mx-auto mt-1 mb-6">
            {receipts.length === 0
              ? 'Scan your first shopping receipt image to automatically match items, increment inventory stock levels, and log discounts.'
              : 'Try clearing your search query to see all past receipts.'}
          </p>
          {receipts.length === 0 && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Scan First Receipt</span>
            </button>
          )}
        </div>
      )}

      {/* Receipts List */}
      <div className="space-y-4">
        {filteredReceipts.map((record) => {
          const isExpanded = expandedId === record.id;
          const matchedCount = record.items?.filter(i => i.status === 'matched_and_incremented').length || 0;
          const newCount = record.items?.filter(i => i.status === 'new_item_created').length || 0;

          return (
            <div
              key={record.id}
              className="bg-white rounded-3xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              {/* Receipt Accordion Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : record.id)}
                className="p-4 sm:p-6 cursor-pointer hover:bg-stone-50/70 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center space-x-3.5 min-w-0 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                    <Store className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-base sm:text-lg text-stone-900 break-words">
                        {record.storeName}
                      </h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-stone-500" />
                        <span>{record.purchaseDate}</span>
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 flex items-center space-x-1">
                        <Home className="w-3 h-3 text-amber-600" />
                        <span>{getHomeLabel(record.destinationHomeId || centralHome.id, true, normalizedHomes)}</span>
                      </span>
                      {record.scannedBy && (
                        <span className="text-[10px] text-stone-500">
                          by {record.scannedBy}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-stone-500">
                      <span className="inline-flex items-center text-emerald-700 font-semibold">
                        <PackageCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        {record.items?.length || 0} items purchased ({matchedCount} stock updated)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side stats & toggle */}
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <div className="text-left sm:text-right">
                    <div className="text-base sm:text-lg font-black text-stone-900">
                      {formatRupiah(record.totalSpent)}
                    </div>
                    {record.discountAmount > 0 && (
                      <div className="text-[11px] font-bold text-emerald-600 flex items-center sm:justify-end space-x-0.5">
                        <Tag className="w-3 h-3 mr-0.5" />
                        <span>-{formatRupiah(record.discountAmount)} discount</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 text-stone-400">
                    <button
                      type="button"
                      aria-label="Toggle receipt details"
                      className="p-2 rounded-xl hover:bg-stone-200 text-stone-500 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Collapsible Details Body */}
              {isExpanded && (
                <div className="p-4 sm:p-6 bg-stone-50/60 border-t border-stone-100 space-y-4">
                  {/* Summary row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-stone-200/80">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Store Location / Name</span>
                      <span className="text-xs sm:text-sm font-bold text-stone-900">{record.storeName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Spent</span>
                      <span className="text-xs sm:text-sm font-bold text-stone-900">{formatRupiah(record.totalSpent)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Discount Savings</span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-600">{formatRupiah(record.discountAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Database Stock Action</span>
                      <span className="text-xs sm:text-sm font-bold text-sky-600">
                        {matchedCount} auto-incremented
                      </span>
                    </div>
                  </div>

                  {/* Purchased & Stocked Items Table */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 flex items-center space-x-1.5">
                      <PackageCheck className="w-4 h-4 text-emerald-600" />
                      <span>Purchased Items Added to Database Stock</span>
                    </h4>

                    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                          <tr>
                            <th className="py-2.5 px-3">Receipt Item</th>
                            <th className="py-2.5 px-3">Matched In Database</th>
                            <th className="py-2.5 px-3 text-center">Qty Purchased</th>
                            <th className="py-2.5 px-3">Price</th>
                            <th className="py-2.5 px-3">Stock Change</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {record.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-stone-50/70">
                              <td className="py-2.5 px-3 font-semibold text-stone-900">
                                {item.receiptItemName}
                              </td>
                              <td className="py-2.5 px-3 text-stone-700">
                                {item.matchedItemName ? (
                                  <span className="inline-flex items-center space-x-1 font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                                    <span>{item.matchedItemName}</span>
                                  </span>
                                ) : (
                                  <span className="text-stone-400 italic">No direct match</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-stone-900">
                                +{item.quantity} {item.unit || ''}
                              </td>
                              <td className="py-2.5 px-3 text-stone-600 font-medium">
                                {item.price ? formatRupiah(item.price) : '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                {item.previousStock !== undefined && item.newStock !== undefined ? (
                                  <span className="text-stone-600">
                                    {item.previousStock} <ArrowRight className="w-3 h-3 inline text-stone-400 mx-0.5" /> <strong>{item.newStock}</strong>
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-semibold">+ {item.quantity} added</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {item.status === 'matched_and_incremented' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Stock Updated
                                  </span>
                                )}
                                {item.status === 'new_item_created' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                    Created New
                                  </span>
                                )}
                                {item.status === 'unmatched_skipped' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                                    Logged
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions & Delete */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('grid')}
                      className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800"
                    >
                      <span>View Inventory Stock</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {onDeleteReceipt && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete receipt record for "${record.storeName}"? (Item stock will remain unchanged)`)) {
                            onDeleteReceipt(record.id);
                          }
                        }}
                        className="inline-flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Receipt Record</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Inter-Home Stock Picks / Transfers Ledger */}
      {transfers.length > 0 && (
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-stone-800 flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-600" />
              <span>Recent Home Stock Picks ({centralHome.name} → Other Homes)</span>
            </h3>
            <span className="text-xs font-semibold text-stone-500">
              {transfers.length} transfer{transfers.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {transfers.slice(0, 15).map(tr => (
              <div
                key={tr.id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-stone-900">{tr.itemName}</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold font-mono">
                    {tr.quantity} {tr.unit || 'units'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-stone-600">
                  <span className="font-semibold">{getHomeLabel(tr.fromHomeId, false, normalizedHomes)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold text-stone-900">{getHomeLabel(tr.toHomeId, false, normalizedHomes)}</span>
                  <span className="text-stone-400">•</span>
                  <span className="text-[11px] text-stone-400">
                    {new Date(tr.transferredAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
