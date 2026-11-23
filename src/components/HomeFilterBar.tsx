import React, { useMemo } from 'react';
import { Home, Warehouse, ArrowRightLeft, SlidersHorizontal } from 'lucide-react';
import { HomeDefinition, HomeId, Item } from '../types/inventory';
import { getCentralHome, getStockForHome, normalizeHomesList } from '../utils/inventory';

interface HomeFilterBarProps {
  homes: HomeDefinition[];
  items: Item[];
  selectedHome: HomeId | 'all';
  onSelectHome: (home: HomeId | 'all') => void;
  onOpenPickModal: (targetHome?: HomeId) => void;
  onOpenManageHomes: () => void;
}

export const HomeFilterBar: React.FC<HomeFilterBarProps> = ({
  homes,
  items,
  selectedHome,
  onSelectHome,
  onOpenPickModal,
  onOpenManageHomes
}) => {
  const normalizedHomes = useMemo(() => normalizeHomesList(homes), [homes]);
  const centralHome = useMemo(() => getCentralHome(normalizedHomes), [normalizedHomes]);
  const branchHomes = useMemo(
    () => normalizedHomes.filter(h => h.id !== centralHome.id),
    [normalizedHomes, centralHome]
  );

  const homeStats = useMemo(() => {
    const totals: Record<string, { units: number; itemsCount: number }> = {};
    normalizedHomes.forEach(h => {
      totals[h.id] = { units: 0, itemsCount: 0 };
    });

    items.forEach(item => {
      const primaryHome: HomeId =
        item.homeId && normalizedHomes.some(h => h.id === item.homeId)
          ? item.homeId
          : centralHome.id;

      normalizedHomes.forEach(h => {
        const stock = getStockForHome(item, h.id, normalizedHomes);
        totals[h.id].units += stock;
        if (primaryHome === h.id || stock > 0) {
          totals[h.id].itemsCount += 1;
        }
      });
    });

    const totalAllUnits = Object.values(totals).reduce((sum, s) => sum + s.units, 0);

    return { totals, totalAllUnits };
  }, [items, normalizedHomes, centralHome]);

  const defaultBranchTarget: HomeId | undefined =
    selectedHome !== 'all' && selectedHome !== centralHome.id
      ? selectedHome
      : branchHomes[0]?.id;

  const centralUnitsAvailable = homeStats.totals[centralHome.id]?.units || 0;
  const activeHomeObj = normalizedHomes.find(h => h.id === selectedHome);

  return (
    <div className="bg-white p-3 sm:p-4 rounded-2xl border border-stone-200/90 shadow-sm space-y-2.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Dynamic Home Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mr-1 flex items-center shrink-0">
            <Home className="w-3.5 h-3.5 mr-1 text-amber-600" />
            <span>Home:</span>
          </span>

          <button
            type="button"
            onClick={() => onSelectHome('all')}
            aria-pressed={selectedHome === 'all'}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center space-x-1.5 ${
              selectedHome === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
            }`}
          >
            <span>All Homes</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                selectedHome === 'all'
                  ? 'bg-stone-700 text-amber-300'
                  : 'bg-white text-stone-700 border border-stone-200'
              }`}
            >
              {homeStats.totalAllUnits}
            </span>
          </button>

          {normalizedHomes.map(home => {
            const isActive = selectedHome === home.id;
            const stats = homeStats.totals[home.id] || { units: 0, itemsCount: 0 };
            return (
              <button
                key={home.id}
                type="button"
                onClick={() => onSelectHome(home.id)}
                aria-pressed={isActive}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center space-x-1.5 ${
                  isActive
                    ? home.isCentral
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                }`}
              >
                {home.isCentral ? (
                  <Warehouse className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Home className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="max-w-[140px] truncate">{home.name}</span>
                {home.isCentral && (
                  <span
                    className={`text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded font-extrabold ${
                      isActive
                        ? 'bg-stone-950 text-amber-400'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    Central
                  </span>
                )}
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    isActive
                      ? home.isCentral
                        ? 'bg-stone-950/15 text-stone-950'
                        : 'bg-stone-700 text-amber-300'
                      : 'bg-white text-stone-700 border border-stone-200'
                  }`}
                >
                  {stats.units}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Manage Homes + Pick from Central */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenManageHomes}
            aria-label="Manage and rename homes"
            className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-200/80 transition-colors shrink-0"
            title="Rename homes or add another home"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
            <span>Manage Homes</span>
          </button>

          {branchHomes.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenPickModal(defaultBranchTarget)}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-extrabold text-xs shadow-xs transition-all shrink-0"
              title={`Transfer / pick items from ${centralHome.name} Central Stock into another home`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>
                Pick from {centralHome.name}
                {activeHomeObj && !activeHomeObj.isCentral ? ` → ${activeHomeObj.name}` : ''}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-stone-950 text-amber-400 font-mono text-[10px]">
                {centralUnitsAvailable}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Contextual Hub Note */}
      <div className="text-[11px] text-stone-500 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100">
        {selectedHome === 'all' && (
          <span>
            Showing combined stock across{' '}
            {normalizedHomes.map((h, i) => (
              <React.Fragment key={h.id}>
                {i > 0 && (i === normalizedHomes.length - 1 ? ', and ' : ', ')}
                <strong>{h.isCentral ? `${h.name} (Central)` : h.name}</strong>
              </React.Fragment>
            ))}
            .
          </span>
        )}
        {activeHomeObj?.isCentral && (
          <span>
            <strong className="text-amber-700">Central Hub ({activeHomeObj.name}):</strong> Main storage where new purchases &amp; restocks arrive. Other homes can pick from here.
          </span>
        )}
        {activeHomeObj && !activeHomeObj.isCentral && (
          <span>
            Viewing <strong>{activeHomeObj.name}</strong> stock. Use <strong>Pick from {centralHome.name}</strong> to pull supplies from Central Stock ({centralUnitsAvailable} units available).
          </span>
        )}
      </div>
    </div>
  );
};
