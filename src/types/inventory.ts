export type HomeId = string;

export type HomeStocks = Record<string, number>;

export interface HomeDefinition {
  id: HomeId;
  name: string;
  isCentral?: boolean;
}

export interface StockTransferRecord {
  id: string;
  itemId: string;
  itemName: string;
  fromHomeId: HomeId;
  toHomeId: HomeId;
  quantity: number;
  unit?: string;
  transferredAt: string;
  transferredBy?: string;
}

export interface Item {
  id: string;
  itemName: string;
  category: string;
  photo: string;
  targetMonthlyStock: number;
  currentStock: number;
  homeId?: HomeId;
  homeStocks?: HomeStocks;
  unit?: string;
  location?: string;
  notes?: string;
  updatedAt?: string;
}

export type ViewTab = 'grid' | 'table' | 'shopping' | 'history';

export type StockStatus = 'out_of_stock' | 'low_stock' | 'good' | 'surplus';

export interface ReceiptItemMatched {
  receiptItemName: string;
  quantity: number;
  price?: number;
  matchedItemId?: string; // id of existing inventory item matched
  matchedItemName?: string; // name in existing database
  matchedCategory?: string;
  previousStock?: number;
  newStock?: number;
  unit?: string;
  status: 'matched_and_incremented' | 'new_item_created' | 'unmatched_skipped';
}

export interface ShoppingReceiptRecord {
  id: string;
  storeName: string;
  purchaseDate: string; // ISO date or readable date
  discountAmount: number;
  totalSpent: number;
  currency: string;
  destinationHomeId?: HomeId;
  receiptImageUrl?: string;
  summaryNotes?: string;
  matchedItemsCount: number;
  items: ReceiptItemMatched[];
  createdAt: string;
  scannedBy?: string;
}
