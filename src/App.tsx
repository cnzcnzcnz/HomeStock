import React, { useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { GridView } from './components/GridView';
import { ItemsTable } from './components/ItemsTable';
import { ShoppingListView } from './components/ShoppingListView';
import { ItemModal } from './components/ItemModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { Item, ViewTab } from './types/inventory';
import {
  loadStoredItems,
  saveStoredItems,
  INITIAL_ITEMS,
  getShoppingList,
  calculateRestockQty,
  clampStock
} from './utils/inventory';
import {
  auth,
  loginWithGoogle,
  logoutUser,
  subscribeToUserItems,
  saveCloudItem,
  deleteCloudItem,
  seedCloudItems,
  isUserCloudInitialized,
  markUserCloudInitialized
} from './lib/firebase';
import { Check, Info, AlertCircle, Cloud } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>(() => loadStoredItems());
  const [currentTab, setCurrentTab] = useState<ViewTab>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3200);
  };

  // Auth state listener & Cloud Firestore synchronization
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (user) {
        setIsSyncing(true);
        showToast(`Signed in as ${user.displayName || user.email}`, 'success');

        // Check permanent initialization state in Firestore
        const alreadyInitialized = await isUserCloudInitialized(user.uid);

        // Listen to Firestore changes in real-time
        unsubscribeFirestore = subscribeToUserItems(
          user.uid,
          async (cloudItems) => {
            setIsSyncing(false);
            if (cloudItems.length > 0) {
              setItems(cloudItems);
              if (!alreadyInitialized) {
                await markUserCloudInitialized(user.uid);
              }
            } else if (!alreadyInitialized) {
              // Brand new user: Seed initial items once
              await markUserCloudInitialized(user.uid);
              const itemsToMigrate = items.length > 0 ? items : INITIAL_ITEMS;
              try {
                await seedCloudItems(user.uid, itemsToMigrate);
                setItems(itemsToMigrate);
                showToast('Synced your household inventory to the cloud!', 'success');
              } catch (err) {
                console.error('Failed to seed cloud items', err);
              }
            } else {
              // User has an already-initialized inventory that is currently empty (e.g. user deleted all items)
              setItems([]);
            }
          },
          (err) => {
            setIsSyncing(false);
            console.error('Firestore listener error', err);
            showToast('Cloud sync connection notice: using offline state', 'warning');
          }
        );
      } else {
        // Logged out
        setItems(loadStoredItems());
      }
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      unsubscribeAuth();
    };
  }, []);

  // Save to localStorage as backup/offline cache
  useEffect(() => {
    saveStoredItems(items);
  }, [items]);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        showToast('Google login error. Please check browser popups.', 'warning');
      }
    }
  };

  // Handle Sign Out
  const handleGoogleLogout = async () => {
    try {
      await logoutUser();
      showToast('Signed out of cloud account', 'info');
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  // Stock increment '+'
  const handleIncrement = async (id: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          currentStock: item.currentStock + 1,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });

    setItems(updated);

    if (currentUser) {
      const changed = updated.find(i => i.id === id);
      if (changed) {
        try {
          await saveCloudItem(currentUser.uid, changed);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  // Stock decrement '-'
  const handleDecrement = async (id: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          currentStock: clampStock(item.currentStock - 1),
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });

    setItems(updated);

    if (currentUser) {
      const changed = updated.find(i => i.id === id);
      if (changed) {
        try {
          await saveCloudItem(currentUser.uid, changed);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  // Restock single item to target monthly stock
  const handleRestockItem = async (id: string, targetMonthlyStock: number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          currentStock: targetMonthlyStock,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });

    setItems(updated);

    if (currentUser) {
      const changed = updated.find(i => i.id === id);
      if (changed) {
        try {
          await saveCloudItem(currentUser.uid, changed);
        } catch (e) {
          console.error(e);
        }
      }
    }
    showToast('Restocked item to monthly target quota!', 'success');
  };

  // Restock all items on the shopping list
  const handleRestockAll = async () => {
    const updated = items.map(item => {
      const restock = calculateRestockQty(item.targetMonthlyStock, item.currentStock);
      if (restock > 0) {
        return {
          ...item,
          currentStock: item.targetMonthlyStock,
          updatedAt: new Date().toISOString()
        };
      }
      return item;
    });

    setItems(updated);

    if (currentUser) {
      try {
        await seedCloudItems(currentUser.uid, updated);
      } catch (e) {
        console.error(e);
      }
    }
    showToast('All shopping list items restocked to target!', 'success');
  };

  // Save (add or edit)
  const handleSaveItem = async (itemData: Omit<Item, 'id' | 'updatedAt'>, editId?: string) => {
    if (editId) {
      const updatedItem: Item = {
        ...itemData,
        id: editId,
        updatedAt: new Date().toISOString()
      };
      setItems(prev => prev.map(i => (i.id === editId ? updatedItem : i)));
      if (currentUser) {
        await saveCloudItem(currentUser.uid, updatedItem);
      }
      showToast(`Updated "${itemData.itemName}"`, 'success');
    } else {
      const newItem: Item = {
        ...itemData,
        id: `item-${Date.now()}`,
        updatedAt: new Date().toISOString()
      };
      setItems(prev => [newItem, ...prev]);
      if (currentUser) {
        await saveCloudItem(currentUser.uid, newItem);
      }
      showToast(`Added "${newItem.itemName}" to inventory`, 'success');
    }
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    try {
      setItems(prev => prev.filter(i => i.id !== id));
      const activeUser = currentUser || auth.currentUser;
      if (activeUser) {
        await deleteCloudItem(activeUser.uid, id);
      }
      showToast('Item deleted', 'info');
    } catch (err) {
      console.error('Delete error', err);
      showToast('Error deleting item from cloud', 'warning');
    }
  };

  // Reset sample data
  const handleResetSampleData = async () => {
    if (window.confirm('Reset all inventory to sample default items?')) {
      setItems(INITIAL_ITEMS);
      if (currentUser) {
        await seedCloudItems(currentUser.uid, INITIAL_ITEMS);
      }
      showToast('Inventory reset to sample household presets', 'info');
    }
  };

  const shoppingList = getShoppingList(items);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      {/* Navigation Bar with Tabs & Google Login */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        shoppingCount={shoppingList.length}
        totalItemsCount={items.length}
        onOpenAddItem={() => {
          setEditingItem(null);
          setIsModalOpen(true);
        }}
        onResetSampleData={handleResetSampleData}
        user={currentUser}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        isSyncing={isSyncing}
      />

      {/* Cloud Banner notification when connected */}
      {currentUser && (
        <div className="bg-emerald-900 text-emerald-100 text-xs py-1.5 px-4 text-center border-b border-emerald-800 flex items-center justify-center space-x-2">
          <Cloud className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Connected to <strong>Google Cloud Firestore</strong> ({currentUser.email}). Changes sync automatically across all devices.
          </span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'grid' && (
          <GridView
            items={items}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onEdit={(item) => {
              setEditingItem(item);
              setIsModalOpen(true);
            }}
            onDelete={(item) => setDeletingItem(item)}
            onOpenAddItem={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            onSwitchToShoppingList={() => setCurrentTab('shopping')}
          />
        )}

        {currentTab === 'table' && (
          <ItemsTable
            items={items}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onEdit={(item) => {
              setEditingItem(item);
              setIsModalOpen(true);
            }}
            onDelete={(item) => setDeletingItem(item)}
            onOpenAddItem={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
          />
        )}

        {currentTab === 'shopping' && (
          <ShoppingListView
            items={items}
            onRestockItem={handleRestockItem}
            onIncrementStock={handleIncrement}
            onRestockAll={handleRestockAll}
            onNavigateToGrid={() => setCurrentTab('grid')}
          />
        )}
      </main>

      {/* Add / Edit Modal */}
      <ItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        initialItem={editingItem}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingItem}
        item={deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteItem}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom-2 duration-200 bg-stone-900 text-white border-stone-800">
          {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-amber-400" />}
          {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>HomeStock • Household Inventory Management System</span>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setCurrentTab('grid')}
              className="hover:text-stone-900 transition-colors"
            >
              Grid View
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setCurrentTab('table')}
              className="hover:text-stone-900 transition-colors"
            >
              Items Table
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setCurrentTab('shopping')}
              className="hover:text-stone-900 transition-colors"
            >
              Shopping List ({shoppingList.length})
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
