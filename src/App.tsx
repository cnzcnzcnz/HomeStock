import React, { useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { GridView } from './components/GridView';
import { ItemsTable } from './components/ItemsTable';
import { ShoppingListView } from './components/ShoppingListView';
import { ShoppingHistoryView } from './components/ShoppingHistoryView';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { ItemModal } from './components/ItemModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { HouseholdModal } from './components/HouseholdModal';
import { PendingInviteBanner } from './components/PendingInviteBanner';
import { Item, ViewTab, ShoppingReceiptRecord } from './types/inventory';
import { Household, HouseholdInvite } from './types/household';
import {
  loadStoredItems,
  saveStoredItems,
  loadStoredReceipts,
  saveStoredReceipts,
  INITIAL_ITEMS,
  getShoppingList,
  calculateRestockQty,
  clampStock
} from './utils/inventory';
import {
  auth,
  loginWithGoogle,
  logoutUser,
  getOrCreateHousehold,
  subscribeToHousehold,
  subscribeToHouseholdItems,
  saveHouseholdItem,
  deleteHouseholdItem,
  seedHouseholdItems,
  checkPendingInvites,
  acceptHouseholdInvite,
  isUserCloudInitialized,
  markUserCloudInitialized,
  getLegacyUserItems,
  saveHouseholdReceipt,
  deleteHouseholdReceipt,
  subscribeToHouseholdReceipts
} from './lib/firebase';
import { Check, Info, AlertCircle, Cloud, Users, Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [items, setItems] = useState<Item[]>(() => loadStoredItems());
  const [receipts, setReceipts] = useState<ShoppingReceiptRecord[]>(() => loadStoredReceipts());
  const [currentTab, setCurrentTab] = useState<ViewTab>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<HouseholdInvite | null>(null);
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const householdRef = useRef<Household | null>(null);
  householdRef.current = household;

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3200);
  };

  // Auth state listener & Family Household Firestore synchronization
  useEffect(() => {
    let unsubscribeHousehold: (() => void) | null = null;
    let unsubscribeItems: (() => void) | null = null;
    let unsubscribeReceipts: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (unsubscribeHousehold) {
        unsubscribeHousehold();
        unsubscribeHousehold = null;
      }
      if (unsubscribeItems) {
        unsubscribeItems();
        unsubscribeItems = null;
      }
      if (unsubscribeReceipts) {
        unsubscribeReceipts();
        unsubscribeReceipts = null;
      }

      if (user) {
        setIsSyncing(true);
        showToast(`Signed in as ${user.displayName || user.email}`, 'success');

        // Optimistically initialize household so the Family modal always opens immediately
        const optimisticHousehold: Household = {
          id: `household-${user.uid.slice(0, 12)}`,
          name: `${user.displayName || user.email?.split('@')[0] || 'My'}'s Family Pantry`,
          ownerUid: user.uid,
          memberUids: [user.uid],
          memberEmails: user.email ? [user.email.toLowerCase()] : [],
          members: [{
            uid: user.uid,
            email: user.email ? user.email.toLowerCase() : '',
            displayName: user.displayName || user.email?.split('@')[0] || 'Family Member',
            photoURL: user.photoURL || undefined,
            role: 'owner',
            joinedAt: new Date().toISOString()
          }],
          createdAt: new Date().toISOString(),
          inviteCode: `FAM-${user.uid.slice(0, 6).toUpperCase()}`
        };
        setHousehold(prev => prev || optimisticHousehold);

        try {
          // 1. Check for any pending family invitations for this user's Google email
          if (user.email) {
            try {
              const invites = await checkPendingInvites(user.email);
              if (invites.length > 0) {
                setPendingInvite(invites[0]);
              }
            } catch (err) {
              console.warn('Pending invites query warning', err);
            }
          }

          // 2. Load or create the user's primary/active household
          const activeHousehold = await getOrCreateHousehold(user);
          setHousehold(activeHousehold);

          // 3. Subscribe to real-time updates for household metadata
          unsubscribeHousehold = subscribeToHousehold(activeHousehold.id, (updatedHousehold) => {
            setHousehold(updatedHousehold);
          });

          // 4. Subscribe to shared household shopping receipts history
          unsubscribeReceipts = subscribeToHouseholdReceipts(activeHousehold.id, (records) => {
            if (records.length > 0) {
              setReceipts(records);
            }
          });

          // 5. Subscribe to shared household inventory items
          const alreadyInitialized = await isUserCloudInitialized(user.uid);

          unsubscribeItems = subscribeToHouseholdItems(
            activeHousehold.id,
            async (sharedItems) => {
              setIsSyncing(false);
              if (sharedItems.length > 0) {
                setItems(sharedItems);
                if (!alreadyInitialized) {
                  await markUserCloudInitialized(user.uid);
                }
              } else {
                // Household has 0 items. Check if the user previously had items in /users/{userId}/items
                try {
                  const legacyItems = await getLegacyUserItems(user.uid);
                  if (legacyItems.length > 0) {
                    await seedHouseholdItems(activeHousehold.id, legacyItems, user);
                    setItems(legacyItems);
                    showToast('Restored all your previous items into your shared family pantry!', 'success');
                    return;
                  }
                } catch (e) {
                  console.warn('Legacy migration check notice', e);
                }

                // If no legacy cloud items, check if current browser has cached items
                const localCached = loadStoredItems();
                if (localCached.length > 0) {
                  await seedHouseholdItems(activeHousehold.id, localCached, user);
                  setItems(localCached);
                  showToast('Synced your household inventory to the cloud!', 'success');
                } else if (!alreadyInitialized) {
                  await markUserCloudInitialized(user.uid);
                  await seedHouseholdItems(activeHousehold.id, INITIAL_ITEMS, user);
                  setItems(INITIAL_ITEMS);
                }
              }
            },
            (err) => {
              setIsSyncing(false);
              console.warn('Household items listener warning', err);
            }
          );
        } catch (error) {
          setIsSyncing(false);
          console.error('Failed to initialize household', error);
          showToast('Could not load family household. Working offline.', 'warning');
        }
      } else {
        // User logged out: clear household context and return to local sandbox storage
        setHousehold(null);
        setPendingInvite(null);
        setItems(loadStoredItems('sandbox'));
        setReceipts(loadStoredReceipts('sandbox'));
      }
    });

    return () => {
      if (unsubscribeHousehold) unsubscribeHousehold();
      if (unsubscribeItems) unsubscribeItems();
      if (unsubscribeReceipts) unsubscribeReceipts();
      unsubscribeAuth();
    };
  }, []);

  // Save to localStorage as offline cache or sandbox
  useEffect(() => {
    saveStoredItems(items, currentUser ? 'cloud_cache' : 'sandbox');
  }, [items, currentUser]);

  useEffect(() => {
    saveStoredReceipts(receipts, currentUser ? 'cloud_cache' : 'sandbox');
  }, [receipts, currentUser]);

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
      setHousehold(null);
      setPendingInvite(null);
      showToast('Signed out of cloud account', 'info');
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  // Accept a pending family invite
  const handleAcceptInvite = async (invite: HouseholdInvite) => {
    if (!currentUser) return;
    setIsAcceptingInvite(true);
    try {
      const joinedHousehold = await acceptHouseholdInvite(invite, currentUser);
      setHousehold(joinedHousehold);
      setPendingInvite(null);
      showToast(`Welcome! You joined ${invite.householdName}`, 'success');
      window.location.reload();
    } catch (error: any) {
      console.error('Failed to accept invite', error);
      showToast(error.message || 'Could not join household', 'warning');
    } finally {
      setIsAcceptingInvite(false);
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

    const currentH = householdRef.current;
    if (currentH && currentUser) {
      const changed = updated.find(i => i.id === id);
      if (changed) {
        try {
          await saveHouseholdItem(currentH.id, changed, currentUser);
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

    const currentH = householdRef.current;
    if (currentH && currentUser) {
      const changed = updated.find(i => i.id === id);
      if (changed) {
        try {
          await saveHouseholdItem(currentH.id, changed, currentUser);
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

    const currentH = householdRef.current;
    if (currentH && currentUser) {
      const changed = updated.find(i => i.id === id);
      if (changed) {
        try {
          await saveHouseholdItem(currentH.id, changed, currentUser);
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

    const currentH = householdRef.current;
    if (currentH && currentUser) {
      try {
        await seedHouseholdItems(currentH.id, updated, currentUser);
      } catch (e) {
        console.error(e);
      }
    }
    showToast('All shopping list items restocked to target!', 'success');
  };

  // Save (add or edit) item
  const handleSaveItem = async (itemData: Omit<Item, 'id' | 'updatedAt'>, editId?: string) => {
    const currentH = householdRef.current;
    if (editId) {
      const updatedItem: Item = {
        ...itemData,
        id: editId,
        updatedAt: new Date().toISOString()
      };
      setItems(prev => prev.map(i => (i.id === editId ? updatedItem : i)));
      if (currentH && currentUser) {
        await saveHouseholdItem(currentH.id, updatedItem, currentUser);
      }
      showToast(`Updated "${itemData.itemName}"`, 'success');
    } else {
      const newItem: Item = {
        ...itemData,
        id: `item-${Date.now()}`,
        updatedAt: new Date().toISOString()
      };
      setItems(prev => [newItem, ...prev]);
      if (currentH && currentUser) {
        await saveHouseholdItem(currentH.id, newItem, currentUser);
      }
      showToast(`Added "${newItem.itemName}" to inventory`, 'success');
    }
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    try {
      setItems(prev => prev.filter(i => i.id !== id));
      const currentH = householdRef.current;
      if (currentH) {
        await deleteHouseholdItem(currentH.id, id);
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
      const currentH = householdRef.current;
      if (currentH && currentUser) {
        await seedHouseholdItems(currentH.id, INITIAL_ITEMS, currentUser);
      }
      showToast('Inventory reset to sample household presets', 'info');
    }
  };

  // Handle Receipt Scanner Apply Action (Increment stock in DB and log summary)
  const handleApplyReceipt = async (
    receiptRecord: ShoppingReceiptRecord,
    updatedItems: Item[],
    newItemsCreated: Item[]
  ) => {
    // 1. Update state locally
    setItems(updatedItems);
    setReceipts(prev => [receiptRecord, ...prev]);

    // 2. Persist to Firestore if logged in
    const currentH = householdRef.current;
    if (currentH && currentUser) {
      try {
        // Save the receipt log record
        await saveHouseholdReceipt(currentH.id, receiptRecord);

        // Update matched items in Firestore
        for (const it of updatedItems) {
          await saveHouseholdItem(currentH.id, it, currentUser);
        }
      } catch (err) {
        console.error('Failed to sync receipt stock updates to cloud', err);
      }
    }

    const stockedCount = receiptRecord.items.filter(i => i.status !== 'unmatched_skipped').length;
    showToast(
      `Receipt from ${receiptRecord.storeName} applied! Updated stock for ${stockedCount} items.`,
      'success'
    );

    // Switch view to History tab to see summary ledger
    setCurrentTab('history');
  };

  // Delete a receipt log record
  const handleDeleteReceipt = async (receiptId: string) => {
    setReceipts(prev => prev.filter(r => r.id !== receiptId));
    const currentH = householdRef.current;
    if (currentH) {
      try {
        await deleteHouseholdReceipt(currentH.id, receiptId);
      } catch (e) {
        console.warn('Error deleting cloud receipt', e);
      }
    }
    showToast('Receipt record deleted from history', 'info');
  };

  const shoppingList = getShoppingList(items);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      {/* Navigation Bar with Tabs & Google Login & Family Share Button */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        shoppingCount={shoppingList.length}
        totalItemsCount={items.length}
        receiptsCount={receipts.length}
        onOpenAddItem={() => {
          setEditingItem(null);
          setIsModalOpen(true);
        }}
        onOpenReceiptScanner={() => setIsReceiptScannerOpen(true)}
        onResetSampleData={handleResetSampleData}
        user={currentUser}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        isSyncing={isSyncing}
        household={household}
        onOpenHousehold={() => setIsHouseholdModalOpen(true)}
      />

      {/* Cloud & Family Status Banner when connected */}
      {currentUser && (
        <div className="bg-emerald-900 text-emerald-100 text-xs py-2 px-4 border-b border-emerald-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Connected to <strong>{household?.name || 'Household Inventory'}</strong>
              {household?.members && household.members.length > 1 && (
                <span className="ml-1.5 inline-flex items-center text-amber-300 font-semibold">
                  <Users className="w-3 h-3 mr-1 inline" />
                  {household.members.length} members sharing
                </span>
              )}
              {' '}• Signed in as <em>{currentUser.email}</em>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsReceiptScannerOpen(true)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-md text-[11px] font-bold transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="w-3 h-3 text-stone-950" />
              <span>Scan Receipt</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHouseholdModalOpen(true)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold transition-all border border-emerald-700 shadow-sm"
            >
              <Users className="w-3 h-3 text-amber-400" />
              <span>Manage Family Sharing</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Pending Invitation Banner if invited by a family member */}
        {pendingInvite && (
          <PendingInviteBanner
            invite={pendingInvite}
            onAccept={handleAcceptInvite}
            onDismiss={() => setPendingInvite(null)}
            isAccepting={isAcceptingInvite}
          />
        )}

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

        {currentTab === 'history' && (
          <ShoppingHistoryView
            receipts={receipts}
            onOpenScanner={() => setIsReceiptScannerOpen(true)}
            onDeleteReceipt={handleDeleteReceipt}
            onNavigateToTab={setCurrentTab}
          />
        )}
      </main>

      {/* Add / Edit Item Modal */}
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

      {/* Household & Family Members Management Modal */}
      <HouseholdModal
        isOpen={isHouseholdModalOpen}
        onClose={() => setIsHouseholdModalOpen(false)}
        household={household}
        currentUser={currentUser}
        onInviteSuccess={(invite) => {
          showToast(`Invitation sent to ${invite.invitedEmail}!`, 'success');
        }}
        onLoginRequest={handleGoogleLogin}
      />

      {/* AI Receipt Scanner Modal with OpenAI Vision */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        existingItems={items}
        onApplyReceipt={handleApplyReceipt}
        currentUserName={currentUser?.displayName || currentUser?.email || 'You'}
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
          <div className="flex items-center space-x-2">
            <span>HomeStock • Household Inventory & Receipt Management</span>
            {household && (
              <span className="hidden sm:inline-flex items-center text-amber-600 font-medium">
                • {household.name}
              </span>
            )}
          </div>
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
            <span>•</span>
            <button
              type="button"
              onClick={() => setCurrentTab('history')}
              className="hover:text-stone-900 transition-colors font-medium text-amber-700"
            >
              Receipts & History ({receipts.length})
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
