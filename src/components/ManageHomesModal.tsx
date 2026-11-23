import React, { useState, useEffect } from 'react';
import {
  X,
  Home,
  Warehouse,
  Plus,
  Check,
  Trash2,
  Star
} from 'lucide-react';
import { HomeDefinition, HomeId, Item } from '../types/inventory';
import { getStockForHome } from '../utils/inventory';

interface ManageHomesModalProps {
  isOpen: boolean;
  onClose: () => void;
  homes: HomeDefinition[];
  items: Item[];
  onRenameHome: (homeId: HomeId, newName: string) => void;
  onAddHome: (name: string) => void;
  onSetCentralHome: (homeId: HomeId) => void;
  onRemoveHome: (homeId: HomeId) => void;
}

export const ManageHomesModal: React.FC<ManageHomesModalProps> = ({
  isOpen,
  onClose,
  homes,
  items,
  onRenameHome,
  onAddHome,
  onSetCentralHome,
  onRemoveHome
}) => {
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [newHomeName, setNewHomeName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedHomeId, setSavedHomeId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      homes.forEach(h => {
        initial[h.id] = h.name;
      });
      setDraftNames(initial);
      setNewHomeName('');
      setErrorMsg(null);
      setSavedHomeId(null);
    }
  }, [isOpen, homes]);

  if (!isOpen) return null;

  const getUnitsInHome = (homeId: HomeId) => {
    return items.reduce((sum, item) => sum + getStockForHome(item, homeId, homes), 0);
  };

  const handleRenameSubmit = (home: HomeDefinition) => {
    const nextName = (draftNames[home.id] ?? home.name).trim();
    if (!nextName) {
      setErrorMsg('Home name cannot be empty.');
      return;
    }
    setErrorMsg(null);
    onRenameHome(home.id, nextName);
    setSavedHomeId(home.id);
    setTimeout(() => {
      setSavedHomeId(prev => (prev === home.id ? null : prev));
    }, 1500);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newHomeName.trim();
    if (!clean) {
      setErrorMsg('Please enter a name for the new home.');
      return;
    }
    if (homes.some(h => h.name.toLowerCase() === clean.toLowerCase())) {
      setErrorMsg(`A home named "${clean}" already exists.`);
      return;
    }
    setErrorMsg(null);
    onAddHome(clean);
    setNewHomeName('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-homes-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 id="manage-homes-title" className="text-lg font-black text-stone-900 tracking-tight">
                Manage &amp; Rename Homes
              </h2>
              <p className="text-xs text-stone-500">
                Rename your homes, designate the Central Hub, or add new homes dynamically.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Close Manage Homes modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {errorMsg && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Existing Homes List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Your Homes ({homes.length})
              </span>
              <span className="text-[11px] text-stone-400">
                Edit a name &amp; click Save
              </span>
            </div>

            {homes.map((home) => {
              const draft = draftNames[home.id] ?? home.name;
              const isDirty = draft.trim() !== home.name && draft.trim().length > 0;
              const unitsCount = getUnitsInHome(home.id);
              const isSaved = savedHomeId === home.id;

              return (
                <div
                  key={home.id}
                  className={`p-3 rounded-2xl border transition-all space-y-2 ${
                    home.isCentral
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-stone-50/70 border-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        home.isCentral
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-white border border-stone-200 text-stone-600'
                      }`}
                    >
                      {home.isCentral ? (
                        <Warehouse className="w-4 h-4" />
                      ) : (
                        <Home className="w-4 h-4" />
                      )}
                    </div>

                    <input
                      type="text"
                      value={draft}
                      maxLength={60}
                      aria-label={`Home name for ${home.name}`}
                      onChange={(e) => {
                        setDraftNames(prev => ({ ...prev, [home.id]: e.target.value }));
                        if (errorMsg) setErrorMsg(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRenameSubmit(home);
                        }
                      }}
                      className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />

                    {isDirty ? (
                      <button
                        type="button"
                        onClick={() => handleRenameSubmit(home)}
                        aria-label={`Save name for ${home.name}`}
                        className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-all shrink-0 flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5 text-amber-400" />
                        <span>Save</span>
                      </button>
                    ) : isSaved ? (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-[11px] shrink-0 flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Saved</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Metadata & Actions row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pl-10 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-stone-500">
                        {unitsCount} unit{unitsCount === 1 ? '' : 's'} stored
                      </span>
                      {home.isCentral && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 font-extrabold text-[10px] uppercase tracking-wider">
                          <Star className="w-2.5 h-2.5 fill-amber-700 text-amber-700" />
                          <span>Central Hub</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!home.isCentral && (
                        <>
                          <button
                            type="button"
                            onClick={() => onSetCentralHome(home.id)}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-amber-50 text-stone-600 hover:text-amber-800 border border-stone-200 font-semibold transition-colors"
                            title="Make this home the Central Hub for restocks and picking"
                          >
                            Set as Central
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveHome(home.id)}
                            aria-label={`Remove ${home.name}`}
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-stone-400 hover:text-rose-600 border border-stone-200 transition-colors"
                            title={`Remove ${home.name} (remaining stock returns to Central Hub)`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Home Form */}
          <form
            onSubmit={handleAddSubmit}
            className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2.5"
          >
            <label
              htmlFor="new-home-name-input"
              className="block text-xs font-bold uppercase tracking-wider text-stone-700"
            >
              Add Another Home Dynamically
            </label>
            <div className="flex gap-2">
              <input
                id="new-home-name-input"
                type="text"
                value={newHomeName}
                maxLength={60}
                onChange={(e) => {
                  setNewHomeName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={`e.g. Home ${homes.length + 1}, Bandung Villa, Office`}
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-extrabold text-xs shadow-xs transition-all flex items-center space-x-1 shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Home</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-500">
              Any newly added home can immediately receive stock picked from your Central Hub. Removing a non-central home automatically returns its stock to the Central Hub.
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
