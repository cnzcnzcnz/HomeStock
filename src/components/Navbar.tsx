import React from 'react';
import { LayoutGrid, Table2, ShoppingBag, Plus, Sparkles, RefreshCw, LogOut, Cloud, CloudOff } from 'lucide-react';
import { User } from 'firebase/auth';
import { ViewTab } from '../types/inventory';

interface NavbarProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  shoppingCount: number;
  totalItemsCount: number;
  onOpenAddItem: () => void;
  onResetSampleData: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  shoppingCount,
  totalItemsCount,
  onOpenAddItem,
  onResetSampleData,
  user,
  onLogin,
  onLogout,
  isSyncing
}) => {
  return (
    <header className="sticky top-0 z-30 bg-stone-900 text-stone-100 shadow-md border-b border-stone-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & App Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white font-sans">
                  HomeStock
                </span>
                <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-medium bg-stone-800 text-stone-300 border border-stone-700">
                  {totalItemsCount}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] sm:text-xs text-stone-400">
                {user ? (
                  <span className="inline-flex items-center text-emerald-400 font-medium">
                    <Cloud className="w-3 h-3 mr-1 shrink-0" />
                    <span>Cloud</span>
                    {isSyncing && <span className="ml-0.5 animate-pulse">...</span>}
                  </span>
                ) : (
                  <span className="inline-flex items-center text-stone-400">
                    <CloudOff className="w-3 h-3 mr-1 shrink-0" />
                    <span>Offline</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop & Tablet Navigation: Hidden on small screens (< md), centered */}
          <nav
            className="hidden md:flex items-center bg-stone-800/80 p-1 rounded-xl border border-stone-700/60"
            aria-label="Desktop Views"
          >
            <button
              type="button"
              onClick={() => onTabChange('grid')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'grid'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
              }`}
              aria-label="Grid View Home Screen"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Grid View</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'table'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
              }`}
              aria-label="Items Table with Math Columns"
            >
              <Table2 className="w-4 h-4" />
              <span>Items Table</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('shopping')}
              className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'shopping'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
              }`}
              aria-label="Shopping List for items needing restock"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Shopping List</span>
              {shoppingCount > 0 && (
                <span
                  className={`ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    currentTab === 'shopping'
                      ? 'bg-stone-950 text-amber-400'
                      : 'bg-rose-500 text-white animate-pulse'
                  }`}
                >
                  {shoppingCount}
                </span>
              )}
            </button>
          </nav>

          {/* Action & Auth Controls */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Reset presets button */}
            <button
              type="button"
              onClick={onResetSampleData}
              title="Reset inventory to default sample presets"
              aria-label="Reset sample inventory"
              className="p-1.5 sm:p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Add Item button */}
            <button
              type="button"
              onClick={onOpenAddItem}
              className="flex items-center space-x-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg shadow-sm transition-all active:scale-95"
              aria-label="Add new item"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span>Add</span>
              <span className="hidden sm:inline">Item</span>
            </button>

            {/* Google Authentication Control */}
            {user ? (
              <div className="flex items-center space-x-1.5 pl-1.5 sm:pl-2 border-l border-stone-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-stone-700 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                    {user.email ? user.email[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="hidden lg:block text-left text-xs max-w-[90px] truncate">
                  <span className="block font-semibold text-stone-200 truncate">
                    {user.displayName || 'User'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors text-xs"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 sm:py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-[11px] sm:text-xs rounded-lg border border-stone-700 transition-all active:scale-95 shadow-sm"
                aria-label="Sign in with Google"
                title="Sign in with Google"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Google Login</span>
                <span className="sm:hidden">Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Mobile Navigation Tab Bar (visible on < md) */}
        <div className="md:hidden pb-2 pt-1 border-t border-stone-800/80">
          <nav
            className="grid grid-cols-3 gap-1 bg-stone-950/70 p-1 rounded-xl border border-stone-800"
            aria-label="Mobile Navigation Tabs"
          >
            <button
              type="button"
              onClick={() => onTabChange('grid')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                currentTab === 'grid'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
              }`}
              aria-label="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>Grid View</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('table')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                currentTab === 'table'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
              }`}
              aria-label="Items Table"
            >
              <Table2 className="w-3.5 h-3.5 shrink-0" />
              <span>Table</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('shopping')}
              className={`relative flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                currentTab === 'shopping'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
              }`}
              aria-label="Shopping List"
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span>Shopping</span>
              {shoppingCount > 0 && (
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    currentTab === 'shopping'
                      ? 'bg-stone-950 text-amber-400'
                      : 'bg-rose-500 text-white animate-pulse'
                  }`}
                >
                  {shoppingCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
