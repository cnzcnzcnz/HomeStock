export interface Item {
  id: string;
  itemName: string;
  category: string;
  photo: string;
  targetMonthlyStock: number;
  currentStock: number;
  unit?: string;
  location?: string;
  notes?: string;
  updatedAt?: string;
}

export type ViewTab = 'grid' | 'table' | 'shopping';

export type StockStatus = 'out_of_stock' | 'low_stock' | 'good' | 'surplus';
